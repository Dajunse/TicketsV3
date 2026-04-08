import Link from "next/link";
import { ActivityStatus, Priority } from "@prisma/client";
import { createActivityAction, updateActivityStatusAction } from "@/actions/activity-actions";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { activityStatusLabel, priorityLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { formatDate } from "@/lib/utils";

function parseMonth(month?: string) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthNumber = Number(monthRaw) - 1;

  if (Number.isNaN(year) || Number.isNaN(monthNumber) || monthNumber < 0 || monthNumber > 11) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return new Date(year, monthNumber, 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const params = await searchParams;
  const context = await getTenantContext();
  const where = context.clientId ? { clientId: context.clientId } : undefined;

  const selectedMonth = parseMonth(params.month);
  const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59, 999);

  const [activities, monthActivities, clients, clientServices] = await Promise.all([
    prisma.activity.findMany({
      where,
      include: {
        clientService: {
          include: { service: true },
        },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.activity.findMany({
      where: where ? { ...where, dueDate: { gte: monthStart, lte: monthEnd } } : { dueDate: { gte: monthStart, lte: monthEnd } },
      include: {
        clientService: {
          include: { service: true },
        },
      },
      orderBy: { dueDate: "asc" },
    }),
    context.isAdmin ? prisma.client.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    context.isAdmin
      ? prisma.clientService.findMany({
          include: { service: true, client: true },
          where: context.clientId ? { clientId: context.clientId } : undefined,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const activitiesByDay = new Map<string, typeof monthActivities>();
  for (const activity of monthActivities) {
    const key = dayKey(activity.dueDate);
    const list = activitiesByDay.get(key) ?? [];
    list.push(activity);
    activitiesByDay.set(key, list);
  }

  const today = new Date();
  const todayKey = dayKey(today);
  const selectedDayKey =
    params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day)
      ? params.day
      : today.getFullYear() === selectedMonth.getFullYear() && today.getMonth() === selectedMonth.getMonth()
        ? todayKey
        : null;
  const activeDayKey = selectedDayKey ?? dayKey(monthStart);
  const selectedDayActivities = activitiesByDay.get(activeDayKey) ?? [];

  const firstGridDate = new Date(monthStart);
  firstGridDate.setDate(monthStart.getDate() - monthStart.getDay());

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate);
    date.setDate(firstGridDate.getDate() + index);
    const key = dayKey(date);
    return {
      key,
      date,
      inMonth: date.getMonth() === selectedMonth.getMonth(),
      isToday: key === todayKey,
      isSelected: selectedDayKey === key,
      items: activitiesByDay.get(key) ?? [],
    };
  });

  const prevMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
  const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);

  return (
    <section className="space-y-6">
      <PageTitle title="Actividades" subtitle="Planificacion operativa por cliente con estados claros." />

      {context.isAdmin ? (
        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 font-title text-lg text-zinc-900">Nueva actividad</h2>
          <form action={createActivityAction} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="status" value={ActivityStatus.PENDING} />
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-zinc-700">Titulo</label>
              <input name="title" required className="w-full rounded-lg px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-zinc-700">Descripcion</label>
              <textarea name="description" rows={3} className="w-full rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Cliente</label>
              <select name="clientId" required className="w-full rounded-lg px-3 py-2">
                {(context.clientId ? clients.filter((c) => c.id === context.clientId) : clients).map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Fecha</label>
              <input name="dueDate" type="date" required className="w-full rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Prioridad</label>
              <select name="priority" className="w-full rounded-lg px-3 py-2">
                {Object.values(Priority).map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabel(priority)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Servicio relacionado</label>
              <select name="clientServiceId" className="w-full rounded-lg px-3 py-2">
                <option value="">Sin relacion</option>
                {clientServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.client.name} - {service.service.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
                Crear actividad
              </button>
            </div>
          </form>
        </article>
      ) : null}

      <article className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-title text-lg text-zinc-900">
            Calendario - {new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(selectedMonth)}
          </h2>
          <div className="flex items-center gap-2">
            <Link
              href={`/activities?month=${monthKey(new Date())}&day=${todayKey}`}
              className="rounded-md border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Hoy
            </Link>
            <Link
              href={`/activities?month=${monthKey(prevMonth)}`}
              className="rounded-md border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Mes anterior
            </Link>
            <Link
              href={`/activities?month=${monthKey(nextMonth)}`}
              className="rounded-md border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              Mes siguiente
            </Link>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-visible rounded-xl border border-zinc-200 bg-white">
            <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
              {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((dayName) => (
                <div
                  key={dayName}
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600"
                >
                  {dayName}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-zinc-200">
              {days.map((day) => (
                <div
                  key={day.key}
                  className={`relative h-20 sm:h-24 lg:h-28 xl:h-32 ${day.inMonth ? "bg-white" : "bg-zinc-50"}`}
                >
                  <Link
                    href={`/activities?month=${monthKey(selectedMonth)}&day=${day.key}`}
                    className={`group block h-full overflow-hidden p-2 transition-colors ${
                      day.isSelected ? "bg-zinc-100" : "hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                          day.isToday
                            ? "bg-zinc-900 text-white"
                            : day.inMonth
                              ? "text-zinc-800"
                              : "text-zinc-400"
                        }`}
                      >
                        {day.date.getDate()}
                      </span>
                      {day.items.length > 0 ? (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] text-white">
                          {day.items.length}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 space-y-1">
                      {day.items.slice(0, 3).map((item, idx) => (
                        <p
                          key={item.id}
                          className={`truncate rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-700 ${
                            idx === 1 ? "hidden sm:block" : idx === 2 ? "hidden lg:block" : ""
                          }`}
                        >
                          {item.title}
                        </p>
                      ))}
                      {day.items.length > 3 ? (
                        <p className="hidden text-[10px] text-zinc-500 xl:block">+{day.items.length - 3} mas</p>
                      ) : null}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 xl:sticky xl:top-6 xl:h-fit">
            <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Dia seleccionado</p>
            <p className="mt-1 font-title text-lg text-zinc-900">
              {new Intl.DateTimeFormat("es-MX", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              }).format(new Date(`${activeDayKey}T00:00:00`))}
            </p>

            <div className="mt-3 space-y-2">
              {selectedDayActivities.map((activity) => (
                <div key={activity.id} className="rounded-lg border border-zinc-200 bg-white p-2">
                  <p className="text-sm font-medium text-zinc-900">{activity.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {activity.clientService?.service?.name ? activity.clientService.service.name : "Sin servicio"}
                  </p>
                  <div className="mt-2">
                    <StatusBadge
                      tone={
                        activity.status === "COMPLETED"
                          ? "success"
                          : activity.status === "IN_PROGRESS"
                            ? "info"
                            : "warning"
                      }
                    >
                      {activityStatusLabel(activity.status)}
                    </StatusBadge>
                  </div>
                </div>
              ))}

              {selectedDayActivities.length === 0 ? (
                <p className="rounded-lg border border-zinc-200 bg-white p-2 text-sm text-zinc-500">
                  No hay actividades para este dia.
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </article>

      <article className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 font-title text-lg text-zinc-900">Linea de tiempo</h2>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="rounded-lg border border-zinc-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900">{activity.title}</p>
                  <p className="text-xs text-zinc-500">
                    {formatDate(activity.dueDate)}
                    {activity.clientService?.service?.name ? ` - ${activity.clientService.service.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    tone={
                      activity.status === "COMPLETED"
                        ? "success"
                        : activity.status === "IN_PROGRESS"
                          ? "info"
                          : "warning"
                    }
                  >
                    {activityStatusLabel(activity.status)}
                  </StatusBadge>
                  {context.isAdmin ? (
                    <form action={updateActivityStatusAction} className="flex items-center gap-2">
                      <input type="hidden" name="activityId" value={activity.id} />
                      <select name="status" defaultValue={activity.status} className="rounded-md px-2 py-1 text-xs">
                        {Object.values(ActivityStatus).map((status) => (
                          <option key={status} value={status}>
                            {activityStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="rounded-md border border-zinc-300 px-2 py-1 text-xs">
                        Guardar
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
              {activity.description ? <p className="mt-2 text-sm text-zinc-700">{activity.description}</p> : null}
            </div>
          ))}
          {activities.length === 0 ? (
            <p className="text-sm text-zinc-500">No hay actividades registradas para este cliente.</p>
          ) : null}
        </div>
      </article>
    </section>
  );
}
