import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createActivityMaterialAction,
  deleteActivityMaterialAction,
} from "@/actions/activity-actions";
import { ActivityQuickEditModal } from "@/components/activity-quick-edit-modal";
import { ActivityMaterialCommentsModal } from "@/components/activity-material-comments-modal";
import { ActivityMaterialEditModal } from "@/components/activity-material-edit-modal";
import { ActivityStatusSelect } from "@/components/activity-status-select";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { activityStatusLabel, priorityLabel } from "@/lib/labels";
import { getMaterialFileHref } from "@/lib/material-files";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { formatDate } from "@/lib/utils";

function dateInputValue(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}

function dayKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const { activityId } = await params;
  const context = await getTenantContext();

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: {
      client: {
        select: { id: true, name: true },
      },
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
  });

  if (!activity) {
    notFound();
  }

  const hasAccess =
    context.isAdmin || Boolean(context.accessibleClientIds?.includes(activity.clientId));

  if (!hasAccess) {
    notFound();
  }

  const clientServices = context.isAdmin
    ? await prisma.clientService.findMany({
        where: { clientId: activity.clientId },
        include: {
          service: true,
          client: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const backHref = `/activities?day=${dayKey(new Date(activity.dueDate))}`;

  return (
    <section className="space-y-6">
      <PageTitle
        title="Ver actividad"
        subtitle={`${activity.client.name} - ${formatDate(activity.dueDate)}`}
      />

      <article className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={backHref}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Volver a actividades
          </Link>
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
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="font-medium text-zinc-900">{activity.title}</p>
          {activity.description ? <p className="mt-1 text-sm text-zinc-700">{activity.description}</p> : null}
          <p className="mt-2 text-xs text-zinc-500">
            Servicio: {activity.clientService?.service?.name ?? "Sin relacion"}
          </p>
        </div>

        {context.isAdmin ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-700">Estado</label>
              <ActivityStatusSelect activityId={activity.id} status={activity.status} />
            </div>
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
          </div>
        ) : null}
      </article>

      <article className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="font-title text-lg text-zinc-900">Materiales de la actividad</h2>
        <p className="mt-1 text-sm text-zinc-600">Gestion y aprobacion de materiales en un solo lugar.</p>

        <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-[920px] w-full text-sm">
            <thead className="bg-[#E5FBB8] text-xs uppercase tracking-[0.08em] text-zinc-800">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Material</th>
                <th className="px-3 py-2 text-center font-medium">Enlace</th>
                <th className="px-3 py-2 text-center font-medium">Archivo</th>
                <th className="px-3 py-2 text-left font-medium">Estado</th>
                <th className="px-3 py-2 text-left font-medium">Validacion</th>
                <th className="px-3 py-2 text-center font-medium">Comentarios</th>
                {context.isAdmin ? <th className="px-3 py-2 text-center font-medium">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {activity.materials.map((material) => (
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
                    ) : null}
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
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                        material.isApproved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
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
                  <td className="px-3 py-2.5 text-center">
                    <ActivityMaterialCommentsModal
                      materialId={material.id}
                      materialName={material.name}
                      isAdmin={context.isAdmin}
                      hasUnreadClientComment={material.hasUnreadClientComment}
                      iconWhenHasComments
                      comments={material.comments.map((comment) => ({
                        id: comment.id,
                        body: comment.body,
                        createdAt: comment.createdAt,
                        authorName: comment.author.name || comment.author.email,
                        authorRole: comment.author.role,
                      }))}
                    />
                  </td>
                  {context.isAdmin ? (
                    <td className="px-3 py-2.5 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <ActivityMaterialEditModal
                          material={{
                            id: material.id,
                            name: material.name,
                            materialUrl: material.materialUrl,
                            isApproved: material.isApproved,
                            fileName: material.fileName,
                            filePublicUrl: material.filePublicUrl,
                          }}
                        />
                        <form action={deleteActivityMaterialAction}>
                          <input type="hidden" name="materialId" value={material.id} />
                          <button
                            type="submit"
                            title="Eliminar material"
                            aria-label={`Eliminar material ${material.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
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
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {activity.materials.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-500">
            Aun no hay materiales para esta actividad.
          </p>
        ) : null}

        {context.isAdmin ? (
          <form
            action={createActivityMaterialAction}
            className="mt-3 grid gap-2 rounded-md border border-zinc-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
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
              Agregar material
            </button>
          </form>
        ) : null}
      </article>
    </section>
  );
}
