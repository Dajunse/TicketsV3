"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateServiceCatalogAction } from "@/actions/admin-actions";

type EditServiceCatalogModalProps = {
  service: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
  };
};

export function EditServiceCatalogModal({ service }: EditServiceCatalogModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setErrorMessage("");
    startTransition(async () => {
      try {
        await updateServiceCatalogAction(formData);
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
        aria-label={`Editar servicio ${service.name}`}
        title="Editar servicio"
      >
        <svg viewBox="0 0 640 640" className="h-4 w-4" aria-hidden="true">
          <path
            d="M100.4 417.2C104.5 402.6 112.2 389.3 123 378.5L304.2 197.3L338.1 163.4C354.7 180 389.4 214.7 442.1 267.4L476 301.3L442.1 335.2L260.9 516.4C250.2 527.1 236.8 534.9 222.2 539L94.4 574.6C86.1 576.9 77.1 574.6 71 568.4C64.9 562.2 62.6 553.3 64.9 545L100.4 417.2zM156 413.5C151.6 418.2 148.4 423.9 146.7 430.1L122.6 517L209.5 492.9C215.9 491.1 221.7 487.8 226.5 483.2L155.9 413.5zM510 267.4C493.4 250.8 458.7 216.1 406 163.4L372 129.5C398.5 103 413.4 88.1 416.9 84.6C430.4 71 448.8 63.4 468 63.4C487.2 63.4 505.6 71 519.1 84.6L554.8 120.3C568.4 133.9 576 152.3 576 171.4C576 190.5 568.4 209 554.8 222.5C551.3 226 536.4 240.9 509.9 267.4z"
            fill="currentColor"
          />
        </svg>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-title text-lg text-zinc-900">Editar servicio</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                Cerrar
              </button>
            </div>

            <form action={handleSubmit} className="space-y-3">
              <input type="hidden" name="serviceId" value={service.id} />
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Nombre</label>
                <input
                  name="name"
                  required
                  defaultValue={service.name}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-700">Descripcion</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={service.description ?? ""}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={service.isActive}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                />
                Servicio activo
              </label>

              {errorMessage ? (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
              ) : null}

              <div className="flex justify-end">
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

