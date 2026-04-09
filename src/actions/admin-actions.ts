"use server";

import bcrypt from "bcryptjs";
import { CredentialType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import {
  generatePublicTicketToken,
  hashPublicToken,
} from "@/lib/public-ticket";
import { prisma } from "@/lib/prisma";

const createClientSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
});

export async function createClientAction(formData: FormData) {
  await requireAdmin();
  const parsed = createClientSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    throw new Error("Invalid client payload");
  }

  const token = generatePublicTicketToken();

  const client = await prisma.client.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      publicTicketSlug: parsed.data.slug,
      publicTicketTokenHash: hashPublicToken(token),
    },
  });

  await prisma.secureNote.create({
    data: {
      clientId: client.id,
      title: "Public ticket URL token",
      type: CredentialType.INTERNAL_NOTE,
      ...encryptSecret(token),
    },
  });

  revalidatePath("/admin");
}

export async function updateClientAction(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;

  await prisma.client.update({
    where: { id },
    data: { name, slug },
  });

  revalidatePath("/admin"); // Refresca la página para ver los cambios
}

const createUserSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(10),
});

export async function createClientUserAction(formData: FormData) {
  await requireAdmin();
  const parsed = createUserSchema.safeParse({
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    throw new Error("Invalid user payload");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: Role.CLIENT,
      passwordHash,
      memberships: {
        create: {
          clientId: parsed.data.clientId,
        },
      },
    },
  });

  revalidatePath("/admin");
}

const createServiceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

export async function createServiceCatalogAction(formData: FormData) {
  await requireAdmin();
  const parsed = createServiceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    throw new Error("Invalid service payload");
  }

  await prisma.serviceCatalog.create({
    data: parsed.data,
  });
  revalidatePath("/admin");
}

const assignServiceSchema = z.object({
  clientId: z.string().min(1),
  serviceId: z.string().min(1),
  notes: z.string().optional(),
});

export async function assignServiceToClientAction(formData: FormData) {
  await requireAdmin();
  const parsed = assignServiceSchema.safeParse({
    clientId: formData.get("clientId"),
    serviceId: formData.get("serviceId"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    throw new Error("Invalid assignment payload");
  }

  await prisma.clientService.upsert({
    where: {
      clientId_serviceId: {
        clientId: parsed.data.clientId,
        serviceId: parsed.data.serviceId,
      },
    },
    create: parsed.data,
    update: {
      notes: parsed.data.notes,
      isActive: true,
    },
  });
  revalidatePath("/admin");
}

const createDocumentSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(2),
  filename: z.string().min(2),
  mimeType: z.string().optional(),
  storagePath: z.string().min(3),
});

export async function createDocumentAction(formData: FormData) {
  await requireAdmin();
  const parsed = createDocumentSchema.safeParse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    filename: formData.get("filename"),
    mimeType: formData.get("mimeType") || undefined,
    storagePath: formData.get("storagePath"),
  });
  if (!parsed.success) {
    throw new Error("Invalid document payload");
  }

  await prisma.document.create({
    data: parsed.data,
  });
  revalidatePath("/documents");
  revalidatePath("/dashboard");
}

const deleteDocumentSchema = z.object({
  documentId: z.string().min(1),
});

export async function deleteDocumentAction(formData: FormData) {
  await requireAdmin();
  const parsed = deleteDocumentSchema.safeParse({
    documentId: formData.get("documentId"),
  });
  if (!parsed.success) {
    throw new Error("Invalid document delete payload");
  }

  await prisma.document.delete({
    where: { id: parsed.data.documentId },
  });
  revalidatePath("/documents");
  revalidatePath("/dashboard");
}

const secureNoteSchema = z.object({
  clientId: z.string().min(1),
  type: z.nativeEnum(CredentialType),
  title: z.string().min(2),
  plainText: z.string().min(2),
});

export async function createSecureNoteAction(formData: FormData) {
  const user = await requireAdmin();
  const parsed = secureNoteSchema.safeParse({
    clientId: formData.get("clientId"),
    type: formData.get("type"),
    title: formData.get("title"),
    plainText: formData.get("plainText"),
  });
  if (!parsed.success) {
    throw new Error("Invalid secure note payload");
  }

  await prisma.secureNote.create({
    data: {
      clientId: parsed.data.clientId,
      type: parsed.data.type,
      title: parsed.data.title,
      createdById: user.id,
      ...encryptSecret(parsed.data.plainText),
    },
  });
  revalidatePath("/admin");
}
