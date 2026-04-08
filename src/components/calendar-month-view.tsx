"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type CalendarActivityItem = {
  id: string;
  title: string;
  status: string;
};

type CalendarDayItem = {
  key: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  items: CalendarActivityItem[];
};

function activityStatusLabel(status: string) {
  if (status === "PENDING") return "Pendiente";
  if (status === "IN_PROGRESS") return "En progreso";
  if (status === "COMPLETED") return "Completada";
  return status;
}

function dateFromKey(dayKey: string) {
  const [yearRaw, monthRaw, dayRaw] = dayKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw) - 1;
  const day = Number(dayRaw);
  return new Date(year, month, day);
}

type CalendarMonthViewProps = {
  monthLabel: string;
  todayMonthKey: string;
  todayDayKey: string;
  prevMonthKey: string;
  nextMonthKey: string;
  initialDayKey: string;
  days: CalendarDayItem[];
};

export function CalendarMonthView({
  monthLabel,
  todayMonthKey,
  todayDayKey,
  prevMonthKey,
  nextMonthKey,
  initialDayKey,
  days,
}: CalendarMonthViewProps) {
  const [activeDayKey, setActiveDayKey] = useState(initialDayKey);
  const dayMap = useMemo(() => new Map(days.map((day) => [day.key, day])), [days]);
  const activeDay = dayMap.get(activeDayKey) ?? days[0];
  const activeActivities = activeDay?.items ?? [];

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-title text-lg text-zinc-900">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?month=${todayMonthKey}&day=${todayDayKey}`}
            className="rounded-md border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Hoy
          </Link>
          <Link
            href={`/calendar?month=${prevMonthKey}`}
            className="rounded-md border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Mes anterior
          </Link>
          <Link
            href={`/calendar?month=${nextMonthKey}`}
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
              <div key={dayName} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">
                {dayName}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-zinc-200">
            {days.map((day) => (
              <div key={day.key} className={`relative h-20 sm:h-24 lg:h-28 xl:h-32 ${day.inMonth ? "bg-white" : "bg-zinc-50"}`}>
                <Link
                  href={`/activities?day=${day.key}`}
                  onMouseEnter={() => setActiveDayKey(day.key)}
                  onFocus={() => setActiveDayKey(day.key)}
                  className={`group block h-full overflow-hidden p-2 transition-colors ${
                    activeDayKey === day.key || day.isSelected ? "bg-zinc-100" : "hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                        day.isToday ? "bg-zinc-900 text-white" : day.inMonth ? "text-zinc-800" : "text-zinc-400"
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    {day.items.length > 0 ? (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] text-white">
                        {day.items.length}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 space-y-1">
                    {day.items.slice(0, 2).map((item, idx) => (
                      <p
                        key={item.id}
                        className={`truncate rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-700 ${idx === 1 ? "hidden sm:block" : ""}`}
                      >
                        {item.title}
                      </p>
                    ))}
                    {day.items.length > 2 ? <p className="hidden text-[10px] text-zinc-500 xl:block">+{day.items.length - 2} mas</p> : null}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 xl:sticky xl:top-6 xl:h-fit">
          <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">Resumen del dia</p>
          <p className="mt-1 font-title text-lg text-zinc-900">
            {activeDay
              ? new Intl.DateTimeFormat("es-MX", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }).format(dateFromKey(activeDay.key))
              : ""}
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            {activeActivities.length === 0 ? "No hay actividades para este dia." : `${activeActivities.length} actividad(es) programada(s).`}
          </p>

          <div className="mt-3 space-y-2">
            {activeActivities.slice(0, 4).map((activity) => (
              <div key={activity.id} className="rounded-md border border-zinc-200 bg-white p-2">
                <p className="text-sm font-medium text-zinc-900">{activity.title}</p>
                <p className="text-xs text-zinc-500">{activityStatusLabel(activity.status)}</p>
              </div>
            ))}
          </div>

          <Link
            href={`/activities?day=${activeDayKey}`}
            className="mt-4 inline-flex rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Ver actividades del dia
          </Link>
        </aside>
      </div>
    </article>
  );
}
