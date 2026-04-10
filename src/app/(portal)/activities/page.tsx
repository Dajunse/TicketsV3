import Link from "next/link";
import { ActivityStatus, Priority } from "@prisma/client";
import {
  createActivityAction,
  createActivityMaterialAction,
  deleteActivityAction,
  deleteActivityMaterialAction,
  updateActivityDetailsAction,
  updateActivityStatusAction,
} from "@/actions/activity-actions";
import { ActivityMaterialCommentsModal } from "@/components/activity-material-comments-modal";
import { ActivityMaterialCheckbox } from "@/components/activity-material-checkbox";
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

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateInputValue(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}

function activityCardTone(status: ActivityStatus) {
  if (status === "COMPLETED") {
    return "border-4 border-emerald-400 bg-emerald-50/35";
  }
  if (status === "IN_PROGRESS") {
    return "border-4 border-sky-400 bg-sky-50/35";
  }
  return "border-[5px] border-amber-400 bg-amber-50/35";
}

function materialsFrameTone(status: ActivityStatus) {
  if (status === "COMPLETED") {
    return "border-2 border-transparent bg-transparent";
  }
  if (status === "IN_PROGRESS") {
    return "border-2 border-transparent bg-transparent";
  }
  return "border-2 border-transparent bg-transparent";
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const params = await searchParams;
  const context = await getTenantContext();

  const selectedDay = parseDay(params.day);
  const selectedDayKey = dayKey(selectedDay);
  const dayStart = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(), 23, 59, 59, 999);

  const whereBase = context.clientId ? { clientId: context.clientId } : {};

  const [activities, clients, clientServices, unreadCommentMaterials] = await Promise.all([
    prisma.activity.findMany({
      where: {
        ...whereBase,
        dueDate: { gte: dayStart, lte: dayEnd },
      },
      include: {
        clientService: {
          include: { service: true },
        },
        materials: {
          include: {
            approvedBy: {
              select: { name: true, email: true },
            },
            comments: {
              include: {
                author: {
                  select: {
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
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
    context.isAdmin
      ? prisma.activityMaterial.findMany({
          where: context.clientId
            ? { hasUnreadClientComment: true, activity: { clientId: context.clientId } }
            : { hasUnreadClientComment: true },
          select: {
            id: true,
            name: true,
            activity: {
              select: {
                dueDate: true,
                title: true,
                client: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const previousDay = new Date(selectedDay);
  previousDay.setDate(previousDay.getDate() - 1);

  const nextDay = new Date(selectedDay);
  nextDay.setDate(nextDay.getDate() + 1);

  const today = new Date();
  const todayKey = dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  return (
    <section className="space-y-6">
      <PageTitle
        title="Actividades propuestas"
        subtitle={`Materiales a revisar para ${new Intl.DateTimeFormat("es-MX", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(selectedDay)}.`}
      />

      <article className="rounded-[20px] border border-transparent bg-gradient-to-b from-zinc-950 via-zinc-950 to-black p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/calendar"
              className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 hover:bg-zinc-100 focus-visible:bg-zinc-200"
            >
              Ir a calendario
            </Link>
            <Link
              href={`/activities?day=${dayKey(previousDay)}`}
              className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 hover:bg-zinc-100 focus-visible:bg-zinc-200"
            >
              Dia anterior
            </Link>
            <Link
              href={`/activities?day=${dayKey(nextDay)}`}
              className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 hover:bg-zinc-100 focus-visible:bg-zinc-200"
            >
              Dia siguiente
            </Link>
          </div>
          <Link
            href={`/activities?day=${todayKey}`}
            className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus-visible:bg-zinc-200"
          >
            Hoy
          </Link>
        </div>
      </article>

      {context.isAdmin && unreadCommentMaterials.length > 0 ? (
        <article className="rounded-xl border-4 border-amber-300 bg-amber-50 p-4">
          <h2 className="font-title text-base text-amber-900">Notificaciones de comentarios</h2>
          <p className="mt-1 text-sm text-amber-800">
            Hay {unreadCommentMaterials.length} publicaciones con comentarios nuevos de cliente.
          </p>
          <div className="mt-3 space-y-2">
            {unreadCommentMaterials.map((material) => (
              <Link
                key={material.id}
                href={`/activities?day=${dayKey(new Date(material.activity.dueDate))}`}
                className="block rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-amber-100"
              >
                {material.activity.client.name} - {material.activity.title} - {material.name}
              </Link>
            ))}
          </div>
        </article>
      ) : null}

      {context.isAdmin ? (
        <article className="rounded-xl border-4 border-emerald-400 bg-gradient-to-b from-zinc-50 to-white p-4">
          <h2 className="mb-3 font-title text-lg text-zinc-900">Nueva actividad</h2>
          <form action={createActivityAction} className="grid gap-3 rounded-xl border-4 border-cyan-400 bg-white p-3 lg:grid-cols-4">
            <input type="hidden" name="status" value={ActivityStatus.PENDING} />
            <div className="lg:col-span-4">
              <label className="mb-1 block text-sm text-zinc-700">Titulo</label>
              <input name="title" required className="w-full rounded-lg px-3 py-2" />
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
              <input name="dueDate" type="date" required defaultValue={selectedDayKey} className="w-full rounded-lg px-3 py-2" />
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
            <div className="lg:col-span-4">
              <label className="mb-1 block text-sm text-zinc-700">Descripcion</label>
              <textarea name="description" rows={2} className="w-full rounded-lg px-3 py-2" />
            </div>
            <div className="lg:col-span-4 flex justify-end">
              <button type="submit" className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
                Crear actividad
              </button>
            </div>
          </form>
        </article>
      ) : null}

      <article className="rounded-xl border-4 border-transparent bg-violet-50/70 p-4">
        <h2 className="mb-3 font-title text-lg text-zinc-900">Actividades del dia</h2>

        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={`relative z-[1] rounded-[30px] border p-4 !shadow-[0_14px_36px_-14px_rgba(0,0,0,0.34)] ${activityCardTone(activity.status)}`}
            >
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
                    <div className="flex items-center gap-2">
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
                          Actualizar estado
                        </button>
                      </form>
                      <form action={deleteActivityAction}>
                        <input type="hidden" name="activityId" value={activity.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100"
                        >
                          Eliminar
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </div>
              {activity.description ? <p className="mt-2 text-sm text-zinc-700">{activity.description}</p> : null}

              {context.isAdmin ? (
                <details className="mt-3 rounded-lg border-4 border-orange-400 bg-white">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-700">
                    Editar actividad
                  </summary>
                  <form action={updateActivityDetailsAction} className="grid gap-2 border-t border-zinc-200 p-3 md:grid-cols-2">
                    <input type="hidden" name="activityId" value={activity.id} />
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs text-zinc-600">Titulo</label>
                      <input
                        name="title"
                        required
                        defaultValue={activity.title}
                        className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs text-zinc-600">Descripcion</label>
                      <textarea
                        name="description"
                        rows={2}
                        defaultValue={activity.description ?? ""}
                        className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-zinc-600">Fecha</label>
                      <input
                        name="dueDate"
                        type="date"
                        required
                        defaultValue={dateInputValue(activity.dueDate)}
                        className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-zinc-600">Prioridad</label>
                      <select
                        name="priority"
                        defaultValue={activity.priority}
                        className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                      >
                        {Object.values(Priority).map((priority) => (
                          <option key={priority} value={priority}>
                            {priorityLabel(priority)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs text-zinc-600">Servicio relacionado</label>
                      <select
                        name="clientServiceId"
                        defaultValue={activity.clientServiceId ?? ""}
                        className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                      >
                        <option value="">Sin relacion</option>
                        {clientServices.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.client.name} - {service.service.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <button type="submit" className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white">
                        Guardar cambios
                      </button>
                    </div>
                  </form>
                </details>
              ) : null}

              <div className="mt-3 rounded-none border-4 border-transparent bg-zinc-50 p-3">
                <p className="text-xs uppercase tracking-[0.1em] text-zinc-500">Materiales a aprobar</p>

                {activity.materials.length > 0 ? (
                  <div className={`overflow-x-auto rounded-none bg-white ${materialsFrameTone(activity.status)}`}>
                    <table className="min-w-[920px] w-full text-sm">
                      <thead className="bg-[#E5FBB8] text-xs uppercase tracking-[0.08em] text-zinc-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Material</th>
                          <th className="px-3 py-2 text-left font-medium">Enlace</th>
                          <th className="px-3 py-2 text-left font-medium">Archivo</th>
                          <th className="px-3 py-2 text-left font-medium">Estado</th>
                          <th className="px-3 py-2 text-left font-medium">Validacion</th>
                          <th className="px-3 py-2 text-left font-medium">Aprobacion</th>
                          {context.isAdmin ? <th className="px-3 py-2 text-left font-medium">Acciones</th> : null}
                          <th className="px-3 py-2 text-left font-medium">Comentarios</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.materials.map((material) => (
                          <tr key={material.id} className="border-t border-zinc-100 align-top">
                            <td className="px-3 py-2.5">
                              <p className="font-medium text-zinc-900">{material.name}</p>
                            </td>
                            <td className="px-3 py-2.5">
                              {material.materialUrl ? (
                                <a
                                  href={material.materialUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
                                >
                                  Ver enlace
                                </a>
                              ) : (
                                <span className="text-xs text-zinc-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {material.filePublicUrl ? (
                                <a
                                  href={material.filePublicUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
                                >
                                  {material.fileName ?? "Descargar"}
                                </a>
                              ) : (
                                <span className="text-xs text-zinc-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                                  material.isApproved
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {material.isApproved ? "Aprobado" : "Pendiente"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <p className="mt-1 text-xs text-zinc-500">
                                {material.isApproved
                                  ? material.approvedBy?.name
                                    ? `Validado por ${material.approvedBy.name}`
                                    : "Validado"
                                  : "Pendiente de validacion"}
                              </p>
                              {material.isApproved && material.approvedAt ? (
                                <p className="text-xs text-zinc-500">{formatDate(material.approvedAt)}</p>
                              ) : null}
                            </td>
                            <td className="px-3 py-2.5">
                              <ActivityMaterialCheckbox materialId={material.id} checked={material.isApproved} />
                            </td>
                            {context.isAdmin ? (
                              <td className="px-3 py-2.5">
                                <form action={deleteActivityMaterialAction}>
                                  <input type="hidden" name="materialId" value={material.id} />
                                  <button
                                    type="submit"
                                    className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100"
                                  >
                                    Eliminar
                                  </button>
                                </form>
                              </td>
                            ) : null}
                            <td className="px-3 py-2.5">
                              <ActivityMaterialCommentsModal
                                materialId={material.id}
                                materialName={material.name}
                                isAdmin={context.isAdmin}
                                hasUnreadClientComment={material.hasUnreadClientComment}
                                comments={material.comments.map((comment) => ({
                                  id: comment.id,
                                  body: comment.body,
                                  createdAt: comment.createdAt,
                                  authorName: comment.author.name || comment.author.email,
                                  authorRole: comment.author.role,
                                }))}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-2 rounded-md border border-dashed border-zinc-300 bg-white p-2 text-sm text-zinc-500">
                    Aun no hay materiales para aprobar en esta actividad.
                  </p>
                )}

                {context.isAdmin ? (
                  <form
                    action={createActivityMaterialAction}
                    className="mt-3 grid gap-2 rounded-md border border-zinc-200 bg-white p-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                  >
                    <input type="hidden" name="activityId" value={activity.id} />
                    <input
                      name="name"
                      required
                      className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                      placeholder="Nombre del material"
                    />
                    <input
                      name="materialUrl"
                      type="url"
                      className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                      placeholder="URL opcional"
                    />
                    <input
                      name="materialFile"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                      className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm"
                    />
                    <p className="md:col-span-3 text-xs text-zinc-500">Archivo opcional. Formatos: PDF, PNG, JPG. Maximo 8MB.</p>
                    <button type="submit" className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white">
                      Agregar
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}

          {activities.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
              No hay actividades propuestas para este dia. Revisa otro dia en el calendario.
            </p>
          ) : null}
        </div>
      </article>
    </section>
  );
}
