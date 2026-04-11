import Link from "next/link";
import { ActivityStatus } from "@prisma/client";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { activityStatusLabel, priorityLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { formatDate } from "@/lib/utils";

function parseDay(day?: string) {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const parsed = new Date(`${day}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  return parsed;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayStartEnd(date: Date) {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0),
    end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999),
  };
}

export default async function ActivitiesDayPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const params = await searchParams;
  const context = await getTenantContext();
  const selectedDay = parseDay(params.day);
  const previousDay = new Date(selectedDay);
  previousDay.setDate(previousDay.getDate() - 1);
  const nextDay = new Date(selectedDay);
  nextDay.setDate(nextDay.getDate() + 1);
  const { start, end } = dayStartEnd(selectedDay);

  const activities = await prisma.activity.findMany({
    where: {
      ...(context.clientId ? { clientId: context.clientId } : {}),
      dueDate: { gte: start, lte: end },
    },
    include: {
      client: {
        select: { name: true },
      },
      clientService: {
        include: { service: true },
      },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return (
    <section className="space-y-6">
      <PageTitle
        title="Actividades del dia"
        subtitle={`Programacion de ${new Intl.DateTimeFormat("es-MX", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(selectedDay)}.`}
      />

      <article className="rounded-[20px] border border-transparent bg-gradient-to-b from-zinc-950 via-zinc-950 to-black p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/calendar?month=${monthKey(selectedDay)}&day=${dayKey(selectedDay)}`}
            className="inline-flex items-center rounded-[20px] border border-zinc-500 bg-zinc-900/40 px-3 py-1 text-sm text-white hover:bg-zinc-900/60 focus-visible:bg-zinc-900/60"
          >
            {"<-"} Volver al calendario
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/activities/day?day=${dayKey(previousDay)}`}
              className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 hover:bg-zinc-100 focus-visible:bg-zinc-200"
            >
              Dia anterior
            </Link>
            <Link
              href={`/activities/day?day=${dayKey(nextDay)}`}
              className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 hover:bg-zinc-100 focus-visible:bg-zinc-200"
            >
              Dia siguiente
            </Link>
            <Link
              href="/activities"
              className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 hover:bg-zinc-100 focus-visible:bg-zinc-200"
            >
              Ver todas las actividades
            </Link>
          </div>
        </div>
      </article>

      <article className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="font-title text-lg text-zinc-900">Listado del dia</h2>
        <p className="mt-1 text-sm text-zinc-600">{activities.length} actividad(es) programada(s).</p>

        <div className="mt-3 space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="rounded-lg border border-zinc-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900">{activity.title}</p>
                  <p className="text-xs text-zinc-500">
                    {formatDate(activity.dueDate)}
                    {context.isAdmin ? ` - ${activity.client.name}` : ""}
                    {activity.clientService?.service?.name ? ` - ${activity.clientService.service.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    tone={
                      activity.status === ActivityStatus.COMPLETED
                        ? "success"
                        : activity.status === ActivityStatus.IN_PROGRESS
                          ? "info"
                          : "warning"
                    }
                  >
                    {activityStatusLabel(activity.status)}
                  </StatusBadge>
                  <StatusBadge
                    tone={
                      activity.priority === "URGENT" || activity.priority === "HIGH"
                        ? "danger"
                        : activity.priority === "MEDIUM"
                          ? "info"
                          : "neutral"
                    }
                  >
                    {priorityLabel(activity.priority)}
                  </StatusBadge>
                  <Link
                    href={`/activities/${activity.id}`}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                  >
                    Ver actividad
                  </Link>
                </div>
              </div>
              {activity.description ? <p className="mt-2 text-sm text-zinc-700">{activity.description}</p> : null}
            </div>
          ))}
          {activities.length === 0 ? (
            <p className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-500">
              No hay actividades programadas para este dia.
            </p>
          ) : null}
        </div>
      </article>
    </section>
  );
}
