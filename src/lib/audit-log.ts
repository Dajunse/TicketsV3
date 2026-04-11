import { Role, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CreateAuditLogInput = {
  actorUserId?: string | null;
  actorRole?: Role | null;
  clientId?: string | null;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  message: string;
  metadata?: Prisma.InputJsonValue | null;
};

export async function createAuditLog(input: CreateAuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        actorRole: input.actorRole ?? null,
        clientId: input.clientId ?? null,
        eventType: input.eventType,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        message: input.message,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("[audit-log] failed to write event", error);
  }
}

