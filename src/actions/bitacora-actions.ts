"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const clearAuditLogSchema = z.object({
  clientId: z.string().optional(),
  userId: z.string().optional(),
  eventType: z.string().optional(),
  confirmText: z.string().trim().min(1),
});

function buildAuditWhere(input: {
  clientId?: string;
  userId?: string;
  eventType?: string;
}): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (input.clientId) where.clientId = input.clientId;
  if (input.userId) where.actorUserId = input.userId;
  if (input.eventType) where.eventType = input.eventType;
  return where;
}

export async function clearAuditLogAction(formData: FormData) {
  await requireAdmin();

  const parsed = clearAuditLogSchema.safeParse({
    clientId: formData.get("clientId") || undefined,
    userId: formData.get("userId") || undefined,
    eventType: formData.get("eventType") || undefined,
    confirmText: formData.get("confirmText"),
  });

  if (!parsed.success) {
    throw new Error("Solicitud invalida para limpiar bitacora");
  }

  if (parsed.data.confirmText !== "LIMPIAR") {
    throw new Error('Escribe "LIMPIAR" para confirmar');
  }

  const auditLogDelegate = (prisma as unknown as {
    auditLog?: {
      deleteMany: (args: { where: Prisma.AuditLogWhereInput }) => Promise<{ count: number }>;
    };
  }).auditLog;

  if (!auditLogDelegate?.deleteMany) {
    throw new Error("Bitacora no disponible en este entorno");
  }

  await auditLogDelegate.deleteMany({
    where: buildAuditWhere(parsed.data),
  });

  revalidatePath("/bitacora");
}
