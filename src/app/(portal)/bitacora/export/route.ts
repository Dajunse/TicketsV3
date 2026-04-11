import { Prisma, Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EVENT_LABELS: Record<string, string> = {
  AUTH_LOGIN: "Inicio de sesion",
  AUTH_LOGOUT: "Cierre de sesion",
  MATERIAL_APPROVED: "Material aprobado",
  MATERIAL_UNAPPROVED: "Material marcado pendiente",
  MATERIAL_COMMENT_CREATED: "Comentario en material",
};

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildAuditWhere(searchParams: URLSearchParams): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  const clientId = searchParams.get("clientId");
  const userId = searchParams.get("userId");
  const eventType = searchParams.get("eventType");

  if (clientId) where.clientId = clientId;
  if (userId) where.actorUserId = userId;
  if (eventType) where.eventType = eventType;

  return where;
}

function buildCsvRows(
  logs: Array<{
    createdAt: Date;
    eventType: string;
    message: string;
    entityType: string | null;
    entityId: string | null;
    client: { name: string } | null;
    actorUser: { name: string | null; email: string; role: string } | null;
  }>,
) {
  const headers = [
    "fecha_iso",
    "evento_codigo",
    "evento",
    "cliente",
    "usuario",
    "correo",
    "rol",
    "detalle",
    "entidad",
  ];

  const lines = [headers.join(",")];

  for (const log of logs) {
    const actorName = log.actorUser?.name || log.actorUser?.email || "";
    const entity = `${log.entityType ?? ""}${log.entityId ? `#${log.entityId}` : ""}`;
    const row = [
      log.createdAt.toISOString(),
      log.eventType,
      EVENT_LABELS[log.eventType] ?? log.eventType,
      log.client?.name ?? "",
      actorName,
      log.actorUser?.email ?? "",
      log.actorUser?.role ?? "",
      log.message,
      entity,
    ].map((value) => escapeCsv(String(value)));

    lines.push(row.join(","));
  }

  return lines.join("\n");
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const auditLogDelegate = (prisma as unknown as {
    auditLog?: {
      findMany: (args: {
        where: Prisma.AuditLogWhereInput;
        include: {
          client: { select: { name: true } };
          actorUser: { select: { name: true; email: true; role: true } };
        };
        orderBy: { createdAt: "desc" };
        take: number;
      }) => Promise<
        Array<{
          createdAt: Date;
          eventType: string;
          message: string;
          entityType: string | null;
          entityId: string | null;
          client: { name: string } | null;
          actorUser: { name: string | null; email: string; role: string } | null;
        }>
      >;
    };
  }).auditLog;

  if (!auditLogDelegate?.findMany) {
    return new Response("Bitacora no disponible", { status: 503 });
  }

  const url = new URL(request.url);
  const where = buildAuditWhere(url.searchParams);

  const logs = await auditLogDelegate.findMany({
    where,
    include: {
      client: { select: { name: true } },
      actorUser: { select: { name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const csv = buildCsvRows(logs);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `bitacora-${stamp}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      "Cache-Control": "no-store",
    },
  });
}
