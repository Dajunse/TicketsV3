import { CalendarMonthView } from "@/components/calendar-month-view";
import { PageTitle } from "@/components/page-title";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

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

export default async function CalendarPage({
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

  const monthActivities = await prisma.activity.findMany({
    where: where ? { ...where, dueDate: { gte: monthStart, lte: monthEnd } } : { dueDate: { gte: monthStart, lte: monthEnd } },
    include: {
      clientService: {
        include: { service: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const activitiesByDay = new Map<string, typeof monthActivities>();
  for (const activity of monthActivities) {
    const key = dayKey(activity.dueDate);
    const list = activitiesByDay.get(key) ?? [];
    list.push(activity);
    activitiesByDay.set(key, list);
  }

  const today = new Date();
  const todayKey = dayKey(today);
  const firstGridDate = new Date(monthStart);
  firstGridDate.setDate(monthStart.getDate() - monthStart.getDay());

  const selectedDayKey =
    params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day)
      ? params.day
      : today.getFullYear() === selectedMonth.getFullYear() && today.getMonth() === selectedMonth.getMonth()
        ? todayKey
        : dayKey(monthStart);

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate);
    date.setDate(firstGridDate.getDate() + index);
    const key = dayKey(date);
    return {
      key,
      dayNumber: date.getDate(),
      inMonth: date.getMonth() === selectedMonth.getMonth(),
      isToday: key === todayKey,
      isSelected: key === selectedDayKey,
      items: (activitiesByDay.get(key) ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
      })),
    };
  });

  const prevMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
  const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);

  return (
    <section className="space-y-6">
      <PageTitle title="Calendario" subtitle="Vista mensual. Pasa el mouse por un dia para ver su resumen." />

      <CalendarMonthView
        monthLabel={new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(selectedMonth)}
        todayMonthKey={monthKey(new Date())}
        todayDayKey={todayKey}
        prevMonthKey={monthKey(prevMonth)}
        nextMonthKey={monthKey(nextMonth)}
        initialDayKey={selectedDayKey}
        days={days}
      />
    </section>
  );
}
