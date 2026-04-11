"use server";

import { Priority, Role, TicketOrigin, TicketStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit-log";
import { assertPublicRateLimit, resolvePublicClient } from "@/lib/public-ticket";
import { prisma } from "@/lib/prisma";

const authenticatedTicketSchema = z.object({
  clientId: z.string().min(1),
  subject: z.string().min(4),
  description: z.string().min(10),
  category: z.string().min(2),
  priority: z.nativeEnum(Priority),
});

const publicTicketSchema = z.object({
  slug: z.string().min(2),
  token: z.string().min(16),
  requesterName: z.string().min(2),
  requesterContact: z.string().min(3),
  subject: z.string().min(4),
  description: z.string().min(10),
  category: z.string().min(2),
  priority: z.nativeEnum(Priority),
  honeypot: z.string().max(0).optional(),
});

export async function createAuthenticatedTicketAction(formData: FormData) {
  const user = await requireUser();
  const parsed = authenticatedTicketSchema.safeParse({
    clientId: formData.get("clientId"),
    subject: formData.get("subject"),
    description: formData.get("description"),
    category: formData.get("category"),
    priority: formData.get("priority"),
  });

  if (!parsed.success) {
    throw new Error("Invalid ticket payload");
  }

  if (user.role !== Role.ADMIN) {
    const belongs = user.memberships.some((m) => m.clientId === parsed.data.clientId);
    if (!belongs) {
      throw new Error("Tenant mismatch");
    }
  }

  await prisma.ticket.create({
    data: {
      clientId: parsed.data.clientId,
      createdById: user.id,
      subject: parsed.data.subject,
      description: parsed.data.description,
      category: parsed.data.category,
      priority: parsed.data.priority,
      origin: TicketOrigin.AUTHENTICATED,
    },
  });

  revalidatePath("/tickets");
  revalidatePath("/dashboard");
}

export type PublicTicketFormState = { ok: boolean; error: string | null };

export async function createPublicTicketAction(
  _: PublicTicketFormState,
  formData: FormData,
): Promise<PublicTicketFormState> {
  const parsed = publicTicketSchema.safeParse({
    slug: formData.get("slug"),
    token: formData.get("token"),
    requesterName: formData.get("requesterName"),
    requesterContact: formData.get("requesterContact"),
    subject: formData.get("subject"),
    description: formData.get("description"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    honeypot: formData.get("companyName") || "",
  });

  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos requeridos." };
  }

  if (parsed.data.honeypot) {
    return { ok: true, error: null };
  }

  const client = await resolvePublicClient(parsed.data.slug, parsed.data.token);
  if (!client) {
    return { ok: false, error: "El enlace no es valido o expiro." };
  }

  const rateLimit = await assertPublicRateLimit(client.id);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: "Demasiados intentos. Intenta de nuevo en unos minutos.",
    };
  }

  await prisma.ticket.create({
    data: {
      clientId: client.id,
      subject: parsed.data.subject,
      description: parsed.data.description,
      category: parsed.data.category,
      priority: parsed.data.priority,
      origin: TicketOrigin.PUBLIC_LINK,
      requesterName: parsed.data.requesterName,
      requesterContact: parsed.data.requesterContact,
    },
  });

  return { ok: true, error: null };
}

const ticketMessageSchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().min(2),
  isInternal: z.boolean().optional(),
});

export async function addTicketMessageAction(formData: FormData) {
  const user = await requireUser();
  const parsed = ticketMessageSchema.safeParse({
    ticketId: formData.get("ticketId"),
    body: formData.get("body"),
    isInternal: formData.get("isInternal") === "true",
  });

  if (!parsed.success) {
    throw new Error("Invalid message");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: parsed.data.ticketId },
  });
  if (!ticket) {
    throw new Error("Ticket not found");
  }

  if (user.role !== Role.ADMIN) {
    const belongs = user.memberships.some((m) => m.clientId === ticket.clientId);
    if (!belongs) {
      throw new Error("Tenant mismatch");
    }
  }

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      authorId: user.id,
      body: parsed.data.body,
      isInternalNote: user.role === Role.ADMIN ? Boolean(parsed.data.isInternal) : false,
    },
  });

  revalidatePath("/tickets");
}

export async function updateTicketStatusAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) {
    throw new Error("Only admins can update ticket status");
  }

  const ticketId = String(formData.get("ticketId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!ticketId || !Object.values(TicketStatus).includes(status as TicketStatus)) {
    throw new Error("Invalid ticket status");
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: status as TicketStatus },
  });
  revalidatePath("/tickets");
  revalidatePath("/dashboard");
}

export async function deleteTicketAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) {
    throw new Error("Only admins can delete tickets");
  }

  const ticketId = String(formData.get("ticketId") ?? "");
  if (!ticketId) {
    throw new Error("Invalid ticket id");
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      clientId: true,
      subject: true,
    },
  });

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  await prisma.ticket.delete({
    where: { id: ticketId },
  });

  await createAuditLog({
    actorUserId: user.id,
    actorRole: user.role,
    clientId: ticket.clientId,
    eventType: "TICKET_DELETED",
    entityType: "TICKET",
    entityId: ticket.id,
    message: `Ticket eliminado: ${ticket.subject}`,
  });

  revalidatePath("/tickets");
  revalidatePath("/dashboard");
}

