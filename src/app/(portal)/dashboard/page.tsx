import Link from "next/link";
import { ActivityStatus, TicketStatus } from "@prisma/client";
import { StatusBadge } from "@/components/status-badge";
import { activityStatusLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const context = await getTenantContext();
  const where = context.clientId ? { clientId: context.clientId } : undefined;
  const clientPendingActivitiesWhere = where
    ? { ...where, status: { in: [ActivityStatus.PENDING, ActivityStatus.IN_PROGRESS] as ActivityStatus[] } }
    : { status: { in: [ActivityStatus.PENDING, ActivityStatus.IN_PROGRESS] as ActivityStatus[] } };

  const [upcomingActivities, recentDone, openTickets, closedTickets, docs] = await Promise.all([
    prisma.activity.findMany({
      where: context.isAdmin
        ? where
          ? { ...where, dueDate: { gte: new Date() } }
          : { dueDate: { gte: new Date() } }
        : clientPendingActivitiesWhere,
      orderBy: { dueDate: "asc" },
      take: context.isAdmin ? 5 : 12,
    }),
    context.isAdmin
      ? prisma.activity.findMany({
          where: where ? { ...where, status: "COMPLETED" } : { status: "COMPLETED" },
          orderBy: { updatedAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    prisma.ticket.count({
      where: where
        ? { ...where, status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } }
        : { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } },
    }),
    prisma.ticket.count({
      where: where ? { ...where, status: TicketStatus.CLOSED } : { status: TicketStatus.CLOSED },
    }),
    context.isAdmin
      ? prisma.document.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1
            className="font-title text-2xl tracking-tight text-zinc-900"
            style={{ fontVariationSettings: '"wght" 900' }}
          >
            Inicio
          </h1>
          <p className="text-sm text-zinc-600">Resumen ejecutivo de actividades, soporte y documentos.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
            {context.isAdmin ? "Actividades proximas" : "Pendientes por aprobar"}
          </p>
          <p className="mt-3 font-title text-3xl text-zinc-900">{upcomingActivities.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Tickets abiertos</p>
          <p className="mt-3 font-title text-3xl text-zinc-900">{openTickets}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">Tickets cerrados</p>
          <p className="mt-3 font-title text-3xl text-zinc-900">{closedTickets}</p>
        </div>
      </div>

      <div className={`grid gap-4 ${context.isAdmin ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
        <article className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="font-title text-lg text-zinc-900">
            {context.isAdmin ? "Proximas actividades" : "Actividades pendientes por aprobar"}
          </h2>
          <div className="space-y-2">
            {upcomingActivities.map((activity) =>
              context.isAdmin ? (
                <div key={activity.id} className="rounded-lg border border-zinc-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-zinc-900">{activity.title}</p>
                    <StatusBadge tone="info">{activityStatusLabel(activity.status)}</StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">{formatDate(activity.dueDate)}</p>
                </div>
              ) : (
                <Link
                  key={activity.id}
                  href={`/activities/${activity.id}`}
                  className="block rounded-lg border border-zinc-200 p-3 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-zinc-900">{activity.title}</p>
                    <StatusBadge tone="warning">Pendiente</StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">{formatDate(activity.dueDate)}</p>
                </Link>
              ),
            )}
            {upcomingActivities.length === 0 ? (
              <p className="text-sm text-zinc-500">
                {context.isAdmin ? "No hay actividades proximas." : "No hay actividades pendientes por aprobar."}
              </p>
            ) : null}
          </div>
        </article>

        {context.isAdmin ? (
          <article className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="font-title text-lg text-zinc-900">Completadas recientes</h2>
            <div className="space-y-2">
              {recentDone.map((activity) => (
                <div key={activity.id} className="rounded-lg border border-zinc-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-zinc-900">{activity.title}</p>
                    <StatusBadge tone="success">{activityStatusLabel(activity.status)}</StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">{formatDate(activity.updatedAt)}</p>
                </div>
              ))}
              {recentDone.length === 0 ? <p className="text-sm text-zinc-500">Aun no hay actividades completadas.</p> : null}
            </div>
          </article>
        ) : null}
      </div>

      {context.isAdmin ? (
        <article className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="font-title text-lg text-zinc-900">Documentos disponibles</h2>
          <ul className="space-y-2">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
                <div>
                  <p className="font-medium text-zinc-800">{doc.title}</p>
                  <p className="text-xs text-zinc-500">{formatDate(doc.createdAt)}</p>
                </div>
                <span className="text-sm text-zinc-700">{doc.filename}</span>
              </li>
            ))}
            {docs.length === 0 ? <li className="text-sm text-zinc-500">No hay documentos cargados.</li> : null}
          </ul>
        </article>
      ) : null}
    </section>
  );
}
