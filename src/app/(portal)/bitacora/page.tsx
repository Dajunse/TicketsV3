import Link from "next/link";
import { Prisma } from "@prisma/client";
import { clearAuditLogAction } from "@/actions/bitacora-actions";
import { PageTitle } from "@/components/page-title";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

const EVENT_LABELS: Record<string, string> = {
  AUTH_LOGIN: "Inicio de sesion",
  AUTH_LOGOUT: "Cierre de sesion",
  MATERIAL_APPROVED: "Material aprobado",
  MATERIAL_UNAPPROVED: "Material marcado pendiente",
  MATERIAL_COMMENT_CREATED: "Comentario en material",
};

function parsePage(value?: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
}

export default async function BitacoraPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; userId?: string; eventType?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const pageSize = 40;
  const currentPage = parsePage(params.page);
  const auditLogDelegate = (prisma as unknown as {
    auditLog?: {
      count: (args: { where: Prisma.AuditLogWhereInput }) => Promise<number>;
      findMany: (args: {
        where: Prisma.AuditLogWhereInput;
        include: {
          client: { select: { id: true; name: true } };
          actorUser: { select: { id: true; name: true; email: true; role: true } };
        };
        orderBy: { createdAt: "desc" };
        skip: number;
        take: number;
      }) => Promise<
        Array<{
          id: string;
          createdAt: Date;
          eventType: string;
          message: string;
          entityType: string | null;
          entityId: string | null;
          client: { id: string; name: string } | null;
          actorUser: { id: string; name: string | null; email: string; role: string } | null;
        }>
      >;
    };
  }).auditLog;

  const where: Prisma.AuditLogWhereInput = {};
  if (params.clientId) where.clientId = params.clientId;
  if (params.userId) where.actorUserId = params.userId;
  if (params.eventType) where.eventType = params.eventType;

  const [clients, users] = await Promise.all([
    prisma.client.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      orderBy: { email: "asc" },
      select: { id: true, name: true, email: true, role: true },
    }),
  ]);

  if (!auditLogDelegate?.count || !auditLogDelegate?.findMany) {
    return (
      <section className="space-y-6">
        <PageTitle title="Bitacora" subtitle="Registro de acciones del sistema para soporte y evidencia." />
        <article className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="font-medium text-amber-900">La bitacora aun no esta disponible en este entorno.</p>
          <p className="mt-1 text-sm text-amber-800">
            Falta actualizar Prisma Client. Ejecuta <code className="rounded bg-amber-100 px-1">npm run prisma:generate</code> y reinicia el servidor.
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Si es Railway, un nuevo deploy despues del push actualiza automaticamente el cliente.
          </p>
        </article>
      </section>
    );
  }

  const totalLogs = await auditLogDelegate.count({ where });

  const totalPages = Math.max(1, Math.ceil(totalLogs / pageSize));
  const page = Math.min(currentPage, totalPages);
  const skip = (page - 1) * pageSize;

  const logs = await auditLogDelegate.findMany({
    where,
    include: {
      client: {
        select: { id: true, name: true },
      },
      actorUser: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
  });

  const buildHref = (nextPage: number) => {
    const query = new URLSearchParams();
    if (params.clientId) query.set("clientId", params.clientId);
    if (params.userId) query.set("userId", params.userId);
    if (params.eventType) query.set("eventType", params.eventType);
    if (nextPage > 1) query.set("page", String(nextPage));
    const queryString = query.toString();
    return queryString ? `/bitacora?${queryString}` : "/bitacora";
  };

  const exportQuery = new URLSearchParams();
  if (params.clientId) exportQuery.set("clientId", params.clientId);
  if (params.userId) exportQuery.set("userId", params.userId);
  if (params.eventType) exportQuery.set("eventType", params.eventType);
  const exportHref = exportQuery.toString() ? `/bitacora/export?${exportQuery.toString()}` : "/bitacora/export";

  return (
    <section className="space-y-6">
      <PageTitle title="Bitacora" subtitle="Registro de acciones del sistema para soporte y evidencia." />

      <article className="rounded-[20px] border border-transparent bg-gradient-to-b from-zinc-950 via-zinc-950 to-black p-4">
        <form method="get" className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_auto]">
          <select
            name="clientId"
            defaultValue={params.clientId ?? ""}
            className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900"
          >
            <option value="">Todos los clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <select
            name="userId"
            defaultValue={params.userId ?? ""}
            className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900"
          >
            <option value="">Todos los usuarios</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name ? `${user.name} (${user.email})` : user.email}
              </option>
            ))}
          </select>
          <select
            name="eventType"
            defaultValue={params.eventType ?? ""}
            className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900"
          >
            <option value="">Todos los eventos</option>
            {Object.entries(EVENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
          >
            Filtrar
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={exportHref}
            className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
          >
            Exportar CSV
          </Link>

          <form action={clearAuditLogAction} className="flex flex-wrap items-center gap-2">
            {params.clientId ? <input type="hidden" name="clientId" value={params.clientId} /> : null}
            {params.userId ? <input type="hidden" name="userId" value={params.userId} /> : null}
            {params.eventType ? <input type="hidden" name="eventType" value={params.eventType} /> : null}
            <input
              name="confirmText"
              required
              placeholder='Escribe "LIMPIAR"'
              className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900"
            />
            <button
              type="submit"
              className="rounded-[20px] border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700 hover:bg-rose-100"
            >
              Limpiar bitacora
            </button>
          </form>
        </div>
      </article>

      <article className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-600">
            {totalLogs} registro(s) - Pagina {page} de {totalPages}
          </p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-zinc-100 text-xs uppercase tracking-[0.08em] text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Fecha</th>
                <th className="px-3 py-2 text-left font-medium">Evento</th>
                <th className="px-3 py-2 text-left font-medium">Cliente</th>
                <th className="px-3 py-2 text-left font-medium">Usuario</th>
                <th className="px-3 py-2 text-left font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-zinc-200 align-top">
                  <td className="px-3 py-2.5 text-zinc-600">{formatDate(log.createdAt)}</td>
                  <td className="px-3 py-2.5 font-medium text-zinc-900">{EVENT_LABELS[log.eventType] ?? log.eventType}</td>
                  <td className="px-3 py-2.5 text-zinc-700">{log.client?.name ?? "N/A"}</td>
                  <td className="px-3 py-2.5 text-zinc-700">
                    {log.actorUser ? (
                      <>
                        <p>{log.actorUser.name || log.actorUser.email}</p>
                        <p className="text-xs text-zinc-500">
                          {log.actorUser.email} - {log.actorUser.role}
                        </p>
                      </>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-zinc-800">{log.message}</p>
                    {log.entityType || log.entityId ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        {log.entityType ?? "ENTIDAD"} {log.entityId ? `#${log.entityId}` : ""}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr className="border-t border-zinc-200">
                  <td colSpan={5} className="px-3 py-4 text-sm text-zinc-500">
                    No hay registros para los filtros seleccionados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-end gap-2">
            <Link
              href={buildHref(Math.max(1, page - 1))}
              aria-disabled={page <= 1}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                page <= 1 ? "pointer-events-none border-zinc-200 text-zinc-400" : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              Anterior
            </Link>
            <span className="text-xs text-zinc-500">
              Pagina {page} de {totalPages}
            </span>
            <Link
              href={buildHref(Math.min(totalPages, page + 1))}
              aria-disabled={page >= totalPages}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                page >= totalPages ? "pointer-events-none border-zinc-200 text-zinc-400" : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              Siguiente
            </Link>
          </div>
        ) : null}
      </article>
    </section>
  );
}
