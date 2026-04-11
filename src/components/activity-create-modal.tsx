"use client";

import { ActivityStatus, Priority } from "@prisma/client";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createActivityAction } from "@/actions/activity-actions";
import { priorityLabel } from "@/lib/labels";

type ClientOption = {
  id: string;
  name: string;
};

type ServiceOption = {
  id: string;
  clientId: string;
  clientName: string;
  serviceName: string;
};

type FeedbackState =
  | { status: "idle"; message: "" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type ActivityCreateModalProps = {
  clients: ClientOption[];
  services: ServiceOption[];
  defaultDueDate: string;
  initialClientId?: string | null;
};

export function ActivityCreateModal({
  clients,
  services,
  defaultDueDate,
  initialClientId,
}: ActivityCreateModalProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(initialClientId || clients[0]?.id || "");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>({ status: "idle", message: "" });
  const [isPending, startTransition] = useTransition();

  const availableServices = useMemo(
    () => services.filter((service) => service.clientId === selectedClientId),
    [services, selectedClientId],
  );

  async function handleSubmit(formData: FormData) {
    const submitMode = String(formData.get("submitMode") ?? "save");
    const keepOpen = submitMode === "save-continue";

    setFeedback({ status: "idle", message: "" });

    startTransition(async () => {
      try {
        await createActivityAction(formData);
        router.refresh();

        if (keepOpen) {
          formRef.current?.reset();
          setSelectedServiceId("");
          setFeedback({
            status: "success",
            message: "Actividad guardada. Puedes crear otra.",
          });
          return;
        }

        setIsOpen(false);
      } catch (error) {
        setFeedback({
          status: "error",
          message: error instanceof Error ? error.message : "No se pudo crear la actividad.",
        });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      >
        Nueva actividad
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-title text-lg text-zinc-900">Programar actividad</h2>
                <p className="text-sm text-zinc-600">Crea tareas sin cambiar de dia.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                Cerrar
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="status" value={ActivityStatus.PENDING} />
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-zinc-700">Titulo</label>
                <input name="title" required className="w-full rounded-lg border border-zinc-200 px-3 py-2" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Cliente</label>
                <select
                  name="clientId"
                  required
                  value={selectedClientId}
                  onChange={(event) => {
                    const nextClientId = event.target.value;
                    setSelectedClientId(nextClientId);
                    if (!services.some((service) => service.clientId === nextClientId && service.id === selectedServiceId)) {
                      setSelectedServiceId("");
                    }
                  }}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2"
                >
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Fecha</label>
                <input
                  name="dueDate"
                  type="date"
                  required
                  defaultValue={defaultDueDate}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Prioridad</label>
                <select name="priority" defaultValue={Priority.MEDIUM} className="w-full rounded-lg border border-zinc-200 px-3 py-2">
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
                  value={selectedServiceId}
                  onChange={(event) => setSelectedServiceId(event.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2"
                >
                  <option value="">Sin relacion</option>
                  {availableServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.clientName} - {service.serviceName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-zinc-700">Descripcion</label>
                <textarea name="description" rows={3} className="w-full rounded-lg border border-zinc-200 px-3 py-2" />
              </div>
              {feedback.status === "error" ? (
                <p className="md:col-span-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {feedback.message}
                </p>
              ) : null}
              {feedback.status === "success" ? (
                <p className="md:col-span-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {feedback.message}
                </p>
              ) : null}
              <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
                <button
                  type="submit"
                  name="submitMode"
                  value="save-continue"
                  disabled={isPending || clients.length === 0}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Guardando..." : "Guardar y crear otra"}
                </button>
                <button
                  type="submit"
                  name="submitMode"
                  value="save"
                  disabled={isPending || clients.length === 0}
                  className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
