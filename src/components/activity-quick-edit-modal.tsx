"use client";

import { ActivityStatus, Priority } from "@prisma/client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateActivityQuickAction } from "@/actions/activity-actions";
import { activityStatusLabel, priorityLabel } from "@/lib/labels";

type ServiceOption = {
  id: string;
  clientId: string;
  label: string;
};

type ActivityQuickEditModalProps = {
  activity: {
    id: string;
    clientId: string;
    title: string;
    description: string;
    dueDate: string;
    priority: Priority;
    status: ActivityStatus;
    clientServiceId: string | null;
  };
  serviceOptions: ServiceOption[];
};

export function ActivityQuickEditModal({ activity, serviceOptions }: ActivityQuickEditModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const servicesForClient = serviceOptions.filter((service) => service.clientId === activity.clientId);

  async function handleSubmit(formData: FormData) {
    setErrorMessage("");

    startTransition(async () => {
      try {
        await updateActivityQuickAction(formData);
        setIsOpen(false);
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
        aria-label="Editar actividad"
        title="Editar actividad"
      >
        <svg viewBox="0 0 640 640" className="h-4 w-4" aria-hidden="true">
          <path
            d="M505 122.9L517.1 135C526.5 144.4 526.5 159.6 517.1 168.9L488 198.1L441.9 152L471 122.9C480.4 113.5 495.6 113.5 504.9 122.9zM273.8 320.2L408 185.9L454.1 232L319.8 366.2C316.9 369.1 313.3 371.2 309.4 372.3L250.9 389L267.6 330.5C268.7 326.6 270.8 323 273.7 320.1zM437.1 89L239.8 286.2C231.1 294.9 224.8 305.6 221.5 317.3L192.9 417.3C190.5 425.7 192.8 434.7 199 440.9C205.2 447.1 214.2 449.4 222.6 447L322.6 418.4C334.4 415 345.1 408.7 353.7 400.1L551 202.9C579.1 174.8 579.1 129.2 551 101.1L538.9 89C510.8 60.9 465.2 60.9 437.1 89zM152 128C103.4 128 64 167.4 64 216L64 488C64 536.6 103.4 576 152 576L424 576C472.6 576 512 536.6 512 488L512 376C512 362.7 501.3 352 488 352C474.7 352 464 362.7 464 376L464 488C464 510.1 446.1 528 424 528L152 528C129.9 528 112 510.1 112 488L112 216C112 193.9 129.9 176 152 176L264 176C277.3 176 288 165.3 288 152C288 138.7 277.3 128 264 128L152 128z"
            fill="currentColor"
          />
        </svg>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-title text-lg text-zinc-900">Edicion rapida de actividad</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                Cerrar
              </button>
            </div>

            <form action={handleSubmit} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="activityId" value={activity.id} />
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-zinc-700">Titulo</label>
                <input
                  name="title"
                  required
                  defaultValue={activity.title}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-zinc-700">Descripcion</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={activity.description}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Fecha</label>
                <input
                  name="dueDate"
                  type="date"
                  required
                  defaultValue={activity.dueDate}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Estado</label>
                <select
                  name="status"
                  defaultValue={activity.status}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2"
                >
                  {Object.values(ActivityStatus).map((status) => (
                    <option key={status} value={status}>
                      {activityStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Prioridad</label>
                <select
                  name="priority"
                  defaultValue={activity.priority}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2"
                >
                  {Object.values(Priority).map((priority) => (
                    <option key={priority} value={priority}>
                      {priorityLabel(priority)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Servicio relacionado</label>
                <select
                  name="clientServiceId"
                  defaultValue={activity.clientServiceId ?? ""}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2"
                >
                  <option value="">Sin relacion</option>
                  {servicesForClient.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.label}
                    </option>
                  ))}
                </select>
              </div>

              {errorMessage ? (
                <p className="md:col-span-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {errorMessage}
                </p>
              ) : null}

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
