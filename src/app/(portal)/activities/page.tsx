import Link from "next/link";
import { ActivityStatus, Prisma } from "@prisma/client";
import { deleteActivityAction } from "@/actions/activity-actions";
import { ActivityCreateModal } from "@/components/activity-create-modal";
import { ActivityQuickEditModal } from "@/components/activity-quick-edit-modal";
import { ActivityMaterialCommentsModal } from "@/components/activity-material-comments-modal";
import { ActivityMaterialCheckbox } from "@/components/activity-material-checkbox";
import { ActivityStatusSelect } from "@/components/activity-status-select";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { activityStatusLabel, priorityLabel } from "@/lib/labels";
import { getMaterialFileHref } from "@/lib/material-files";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { formatDate } from "@/lib/utils";

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parsePage(page?: string) {
  const parsed = Number(page);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
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
  searchParams: Promise<{ page?: string; showCompleted?: string; showApprovedMaterials?: string }>;
}) {
  const params = await searchParams;
  const context = await getTenantContext();
  const todayKey = dayKey(new Date());
  const requestedPage = parsePage(params.page);
  const showCompleted = params.showCompleted === "1";
  const showApprovedMaterials = params.showApprovedMaterials === "1";
  const pageSize = 12;

  const whereBase = context.clientId ? { clientId: context.clientId } : {};
  const statusFilter = showCompleted
    ? {}
    : { status: { in: [ActivityStatus.PENDING, ActivityStatus.IN_PROGRESS] as ActivityStatus[] } };
  const activityWhere: Prisma.ActivityWhereInput = { ...whereBase, ...statusFilter };

  if (!context.isAdmin && !showApprovedMaterials) {
    activityWhere.OR = [
      { materials: { none: {} } },
      { materials: { some: { isApproved: false } } },
    ];
  }

  const totalActivities = await prisma.activity.count({
    where: activityWhere,
  });

  const totalPages = Math.max(1, Math.ceil(totalActivities / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * pageSize;

  const [activities, clients, clientServices, unreadCommentMaterials, scheduledActivities] = await Promise.all([
    prisma.activity.findMany({
      where: activityWhere,
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
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
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
          where: { hasUnreadClientComment: true },
          select: {
            id: true,
            name: true,
            activity: {
              select: {
                id: true,
                dueDate: true,
                title: true,
                client: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
    context.isAdmin
      ? prisma.activity.findMany({
          where: activityWhere,
          include: {
            client: {
              select: { name: true },
            },
            clientService: {
              include: {
                service: {
                  select: { name: true },
                },
              },
            },
            materials: {
              select: {
                id: true,
                name: true,
                isApproved: true,
                materialUrl: true,
                filePublicUrl: true,
                fileName: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
          skip,
          take: pageSize,
        })
      : Promise.resolve([]),
  ]);

  const unreadCommentMaterialsForView =
    context.isAdmin && context.clientId
      ? unreadCommentMaterials.filter((material) => material.activity.client.id === context.clientId)
      : unreadCommentMaterials;

  const buildPageHref = (
    page: number,
    includeCompleted = showCompleted,
    includeApprovedMaterials = showApprovedMaterials,
  ) => {
    const query = new URLSearchParams();
    if (page > 1) {
      query.set("page", String(page));
    }
    if (includeCompleted) {
      query.set("showCompleted", "1");
    }
    if (includeApprovedMaterials) {
      query.set("showApprovedMaterials", "1");
    }
    const queryString = query.toString();
    return queryString ? `/activities?${queryString}` : "/activities";
  };

  return (
    <section className="space-y-6">
      <PageTitle
        title="Actividades propuestas"
        subtitle={
          showCompleted
            ? "Listado general con pendientes, en progreso y completadas."
            : "Listado priorizado de proximas actividades pendientes y en progreso."
        }
      />

      <article className="rounded-[20px] border border-transparent bg-gradient-to-b from-zinc-950 via-zinc-950 to-black p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={buildPageHref(1, !showCompleted)}
              className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 hover:bg-zinc-100 focus-visible:bg-zinc-200"
            >
              {showCompleted ? "Ocultar completadas" : "Mostrar completadas"}
            </Link>
            {!context.isAdmin ? (
              <Link
                href={buildPageHref(1, showCompleted, !showApprovedMaterials)}
                className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 hover:bg-zinc-100 focus-visible:bg-zinc-200"
              >
                {showApprovedMaterials ? "Ocultar aprobados" : "Mostrar aprobados"}
              </Link>
            ) : null}
            <span className="text-xs text-zinc-300">
              {totalActivities} actividad(es) - Pagina {currentPage} de {totalPages}
            </span>
          </div>
          <Link
            href="/calendar"
            className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 hover:bg-zinc-100 focus-visible:bg-zinc-200"
          >
            Volver al calendario
          </Link>
        </div>
      </article>

      {context.isAdmin && unreadCommentMaterialsForView.length > 0 ? (
        <article className="rounded-xl border-4 border-amber-300 bg-amber-50 p-4">
          <h2 className="font-title text-base text-amber-900">Notificaciones de comentarios</h2>
          <p className="mt-1 text-sm text-amber-800">
            Hay {unreadCommentMaterialsForView.length} publicaciones con comentarios nuevos de cliente.
          </p>
          <div className="mt-3 space-y-2">
            {unreadCommentMaterialsForView.map((material) => (
              <Link
                key={material.id}
                href={`/activities/${material.activity.id}`}
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-title text-lg text-zinc-900">Programacion de actividades</h2>
              <p className="text-sm text-zinc-600">Tabla global para planear tareas sin ir dia por dia.</p>
            </div>
            <ActivityCreateModal
              clients={(context.clientId ? clients.filter((client) => client.id === context.clientId) : clients).map((client) => ({
                id: client.id,
                name: client.name,
              }))}
              services={clientServices.map((service) => ({
                id: service.id,
                clientId: service.clientId,
                clientName: service.client.name,
                serviceName: service.service.name,
              }))}
              defaultDueDate={todayKey}
              initialClientId={context.clientId ?? clients[0]?.id ?? null}
            />
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="min-w-[1040px] w-full text-sm">
              <thead className="bg-zinc-100 text-xs uppercase tracking-[0.08em] text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Fecha</th>
                  <th className="px-3 py-2 text-left font-medium">Cliente</th>
                  <th className="px-3 py-2 text-left font-medium">Titulo</th>
                  <th className="px-3 py-2 text-left font-medium">Servicio</th>
                  <th className="px-3 py-2 text-left font-medium">Prioridad</th>
                  <th className="px-3 py-2 text-left font-medium">Estado</th>
                  <th className="w-24 px-2 py-2 text-center font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-zinc-900 text-white">
                        <svg viewBox="0 0 640 640" className="h-2.5 w-2.5" aria-hidden="true">
                          <path d="M96 160C96 124.7 124.7 96 160 96L480 96C515.3 96 544 124.7 544 160L544 480C544 515.3 515.3 544 480 544L160 544C124.7 544 96 515.3 96 480L96 160zM144 432L144 464C144 472.8 151.2 480 160 480L192 480C200.8 480 208 472.8 208 464L208 432C208 423.2 200.8 416 192 416L160 416C151.2 416 144 423.2 144 432zM448 416C439.2 416 432 423.2 432 432L432 464C432 472.8 439.2 480 448 480L480 480C488.8 480 496 472.8 496 464L496 432C496 423.2 488.8 416 480 416L448 416zM144 304L144 336C144 344.8 151.2 352 160 352L192 352C200.8 352 208 344.8 208 336L208 304C208 295.2 200.8 288 192 288L160 288C151.2 288 144 295.2 144 304zM448 288C439.2 288 432 295.2 432 304L432 336C432 344.8 439.2 352 448 352L480 352C488.8 352 496 344.8 496 336L496 304C496 295.2 488.8 288 480 288L448 288zM144 176L144 208C144 216.8 151.2 224 160 224L192 224C200.8 224 208 216.8 208 208L208 176C208 167.2 200.8 160 192 160L160 160C151.2 160 144 167.2 144 176zM448 160C439.2 160 432 167.2 432 176L432 208C432 216.8 439.2 224 448 224L480 224C488.8 224 496 216.8 496 208L496 176C496 167.2 488.8 160 480 160L448 160z" fill="currentColor" />
                        </svg>
                      </span>
                      <span></span>
                    </span>
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Acciones</th>
                </tr>
              </thead>
              {scheduledActivities.map((activity) => (
                <tbody key={activity.id}>
                  <tr className="border-t border-zinc-200 align-top">
                    <td className="px-3 py-2 text-zinc-700">{formatDate(activity.dueDate)}</td>
                    <td className="px-3 py-2 text-zinc-700">{activity.client.name}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-zinc-900">{activity.title}</p>
                      {activity.description ? <p className="mt-1 text-xs text-zinc-500">{activity.description}</p> : null}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">{activity.clientService?.service?.name ?? "Sin relacion"}</td>
                    <td className="px-3 py-2 text-zinc-700">{priorityLabel(activity.priority)}</td>
                    <td className="px-3 py-2">
                      <ActivityStatusSelect activityId={activity.id} status={activity.status} />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span className="inline-flex min-w-6 justify-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                        {activity.materials.length}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <ActivityQuickEditModal
                          activity={{
                            id: activity.id,
                            clientId: activity.clientId,
                            title: activity.title,
                            description: activity.description ?? "",
                            dueDate: dateInputValue(activity.dueDate),
                            priority: activity.priority,
                            status: activity.status,
                            clientServiceId: activity.clientServiceId,
                          }}
                          serviceOptions={clientServices.map((service) => ({
                            id: service.id,
                            clientId: service.clientId,
                            label: `${service.client.name} - ${service.service.name}`,
                          }))}
                        />
                        <Link
                          href={`/activities/${activity.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                          aria-label="Ver actividad"
                          title="Ver actividad"
                        >
                          <svg viewBox="0 0 640 640" className="h-4 w-4" aria-hidden="true">
                            <path
                              d="M354.4 83.8C359.4 71.8 371.1 64 384 64L544 64C561.7 64 576 78.3 576 96L576 256C576 268.9 568.2 280.6 556.2 285.6C544.2 290.6 530.5 287.8 521.3 278.7L464 221.3L310.6 374.6C298.1 387.1 277.8 387.1 265.3 374.6C252.8 362.1 252.8 341.8 265.3 329.3L418.7 176L361.4 118.6C352.2 109.4 349.5 95.7 354.5 83.7zM64 240C64 195.8 99.8 160 144 160L224 160C241.7 160 256 174.3 256 192C256 209.7 241.7 224 224 224L144 224C135.2 224 128 231.2 128 240L128 496C128 504.8 135.2 512 144 512L400 512C408.8 512 416 504.8 416 496L416 416C416 398.3 430.3 384 448 384C465.7 384 480 398.3 480 416L480 496C480 540.2 444.2 576 400 576L144 576C99.8 576 64 540.2 64 496L64 240z"
                              fill="currentColor"
                            />
                          </svg>
                        </Link>
                        <form action={deleteActivityAction}>
                          <input type="hidden" name="activityId" value={activity.id} />
                          <button
                            type="submit"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                            aria-label="Eliminar actividad"
                            title="Eliminar actividad"
                          >
                            <svg viewBox="0 0 640 640" className="h-4 w-4" aria-hidden="true">
                              <path
                                d="M320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM232 296L408 296C421.3 296 432 306.7 432 320C432 333.3 421.3 344 408 344L232 344C218.7 344 208 333.3 208 320C208 306.7 218.7 296 232 296z"
                                fill="currentColor"
                              />
                            </svg>
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-t border-zinc-100 bg-zinc-50/60">
                    <td colSpan={8} className="px-3 py-2.5">
                      <details>
                        <summary className="cursor-pointer rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
                          {activity.materials.length > 0 ? `Materiales (${activity.materials.length})` : "Sin materiales"}
                        </summary>
                        {activity.materials.length > 0 ? (
                          <div className="mt-2 overflow-x-auto rounded-md border border-zinc-200 bg-white">
                            <table className="min-w-[680px] w-full text-xs">
                              <thead className="bg-zinc-100 text-zinc-600">
                                <tr>
                                  <th className="px-2 py-1.5 text-left font-medium">Material</th>
                                  <th className="px-2 py-1.5 text-left font-medium">Estado</th>
                                  <th className="px-2 py-1.5 text-left font-medium">Recurso</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activity.materials.map((material) => (
                                  <tr key={material.id} className="border-t border-zinc-100">
                                    <td className="px-2 py-1.5 text-zinc-800">{material.name}</td>
                                    <td className="px-2 py-1.5">
                                      <span
                                        className={`inline-flex rounded-full px-2 py-0.5 ${
                                          material.isApproved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                        }`}
                                      >
                                        {material.isApproved ? "Aprobado" : "Pendiente"}
                                      </span>
                                    </td>
                                    <td className="px-2 py-1.5">
                                      {getMaterialFileHref(material) ? (
                                        <a
                                          href={getMaterialFileHref(material)!}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
                                        >
                                          {material.fileName ?? "Archivo"}
                                        </a>
                                      ) : material.materialUrl ? (
                                        <a
                                          href={material.materialUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
                                        >
                                          Ver enlace
                                        </a>
                                      ) : (
                                        <span className="text-zinc-400">Sin recurso</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </details>
                    </td>
                  </tr>
                </tbody>
              ))}
            </table>
            {scheduledActivities.length === 0 ? (
              <p className="border-t border-zinc-200 px-3 py-4 text-sm text-zinc-500">No hay actividades programadas para mostrar.</p>
            ) : null}
          </div>

          {totalPages > 1 ? (
            <div className="mt-3 flex items-center justify-end gap-2">
              <Link
                href={buildPageHref(Math.max(1, currentPage - 1))}
                aria-disabled={currentPage <= 1}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  currentPage <= 1
                    ? "pointer-events-none border-zinc-200 text-zinc-400"
                    : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                Anterior
              </Link>
              <span className="text-xs text-zinc-500">
                Pagina {currentPage} de {totalPages}
              </span>
              <Link
                href={buildPageHref(Math.min(totalPages, currentPage + 1))}
                aria-disabled={currentPage >= totalPages}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  currentPage >= totalPages
                    ? "pointer-events-none border-zinc-200 text-zinc-400"
                    : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                Siguiente
              </Link>
            </div>
          ) : null}
        </article>
      ) : null}

      {!context.isAdmin ? (
        <article className="rounded-xl border-4 border-transparent bg-violet-50/70 p-4">
          <h2 className="mb-3 font-title text-lg text-zinc-900">Actividades programadas</h2>

          <div className="space-y-3">
            {activities.map((activity) => {
              const visibleMaterials = showApprovedMaterials
                ? activity.materials
                : activity.materials.filter((material) => !material.isApproved);

              return (
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
                  </div>
                </div>
                {activity.description ? <p className="mt-2 text-sm text-zinc-700">{activity.description}</p> : null}

                <div className="mt-3 rounded-none border-4 border-transparent bg-zinc-50 p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-zinc-500">Materiales a aprobar</p>

                  {visibleMaterials.length > 0 ? (
                    <div className={`overflow-x-auto rounded-none bg-white ${materialsFrameTone(activity.status)}`}>
                      <table className="min-w-[920px] w-full text-sm">
                        <thead className="bg-[#E5FBB8] text-xs uppercase tracking-[0.08em] text-zinc-800">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Material</th>
                            <th className="px-3 py-2 text-center font-medium">Enlace</th>
                            <th className="px-3 py-2 text-center font-medium">Archivo</th>
                            <th className="px-3 py-2 text-left font-medium">Estado</th>
                            <th className="px-3 py-2 text-left font-medium">Validacion</th>
                            <th className="px-3 py-2 text-left font-medium">Aprobacion</th>
                            <th className="px-3 py-2 text-left font-medium">Comentarios</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleMaterials.map((material) => (
                            <tr key={material.id} className="border-t border-zinc-100 align-top">
                              <td className="px-3 py-2.5">
                                <p className="font-medium text-zinc-900">{material.name}</p>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {material.materialUrl ? (
                                  <a
                                    href={material.materialUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Abrir enlace"
                                    aria-label="Abrir enlace"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                                  >
                                    <svg viewBox="0 0 640 640" className="h-4 w-4" aria-hidden="true">
                                      <path
                                        d="M451.5 160C434.9 160 418.8 164.5 404.7 172.7C388.9 156.7 370.5 143.3 350.2 133.2C378.4 109.2 414.3 96 451.5 96C537.9 96 608 166 608 252.5C608 294 591.5 333.8 562.2 363.1L491.1 434.2C461.8 463.5 422 480 380.5 480C294.1 480 224 410 224 323.5C224 322 224 320.5 224.1 319C224.6 301.3 239.3 287.4 257 287.9C274.7 288.4 288.6 303.1 288.1 320.8C288.1 321.7 288.1 322.6 288.1 323.4C288.1 374.5 329.5 415.9 380.6 415.9C405.1 415.9 428.6 406.2 446 388.8L517.1 317.7C534.4 300.4 544.2 276.8 544.2 252.3C544.2 201.2 502.8 159.8 451.7 159.8zM307.2 237.3C305.3 236.5 303.4 235.4 301.7 234.2C289.1 227.7 274.7 224 259.6 224C235.1 224 211.6 233.7 194.2 251.1L123.1 322.2C105.8 339.5 96 363.1 96 387.6C96 438.7 137.4 480.1 188.5 480.1C205 480.1 221.1 475.7 235.2 467.5C251 483.5 269.4 496.9 289.8 507C261.6 530.9 225.8 544.2 188.5 544.2C102.1 544.2 32 474.2 32 387.7C32 346.2 48.5 306.4 77.8 277.1L148.9 206C178.2 176.7 218 160.2 259.5 160.2C346.1 160.2 416 230.8 416 317.1C416 318.4 416 319.7 416 321C415.6 338.7 400.9 352.6 383.2 352.2C365.5 351.8 351.6 337.1 352 319.4C352 318.6 352 317.9 352 317.1C352 283.4 334 253.8 307.2 237.5z"
                                        fill="currentColor"
                                      />
                                    </svg>
                                  </a>
                                ) : (
                                  <span className="text-xs text-zinc-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {getMaterialFileHref(material) ? (
                                  <a
                                    href={getMaterialFileHref(material)!}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={material.fileName ?? "Descargar archivo"}
                                    aria-label={material.fileName ?? "Descargar archivo"}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                                  >
                                    <svg viewBox="0 0 640 640" className="h-4 w-4" aria-hidden="true">
                                      <path
                                        d="M88 289.6L64.4 360.2L64.4 160C64.4 124.7 93.1 96 128.4 96L267.1 96C280.9 96 294.4 100.5 305.5 108.8L343.9 137.6C349.4 141.8 356.2 144 363.1 144L480.4 144C515.7 144 544.4 172.7 544.4 208L544.4 224L179 224C137.7 224 101 250.4 87.9 289.6zM509.8 512L131 512C98.2 512 75.1 479.9 85.5 448.8L133.5 304.8C140 285.2 158.4 272 179 272L557.8 272C590.6 272 613.7 304.1 603.3 335.2L555.3 479.2C548.8 498.8 530.4 512 509.8 512z"
                                        fill="currentColor"
                                      />
                                    </svg>
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
                                <ActivityMaterialCheckbox
                                  materialId={material.id}
                                  checked={material.isApproved}
                                  showStatusLabel={false}
                                />
                              </td>
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
                      {showApprovedMaterials
                        ? "Aun no hay materiales para aprobar en esta actividad."
                        : "No hay materiales pendientes por aprobar en esta actividad."}
                    </p>
                  )}
                </div>
              </div>
              );
            })}

            {activities.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
                {showCompleted
                  ? "No hay actividades programadas."
                  : "No hay actividades pendientes o en progreso en esta pagina."}
              </p>
            ) : null}
          </div>

          {totalPages > 1 ? (
            <div className="mt-3 flex items-center justify-end gap-2">
              <Link
                href={buildPageHref(Math.max(1, currentPage - 1))}
                aria-disabled={currentPage <= 1}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  currentPage <= 1
                    ? "pointer-events-none border-zinc-200 text-zinc-400"
                    : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                Anterior
              </Link>
              <span className="text-xs text-zinc-500">
                Pagina {currentPage} de {totalPages}
              </span>
              <Link
                href={buildPageHref(Math.min(totalPages, currentPage + 1))}
                aria-disabled={currentPage >= totalPages}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  currentPage >= totalPages
                    ? "pointer-events-none border-zinc-200 text-zinc-400"
                    : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                Siguiente
              </Link>
            </div>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
