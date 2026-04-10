"use client";

import { useState } from "react";
import { updateClientAction } from "@/actions/admin-actions";

type EditClient = {
  id: string;
  name: string;
  slug: string;
};

export function EditClientModal({ client }: { client: EditClient }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="mt-2 cursor-pointer text-xs font-semibold text-blue-600"
      >
        Editar datos del cliente
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-center">
              <h3 className="mb-4 text-lg font-bold text-black">Editar Cliente: {client.name}</h3>
            </div>

            <form
              action={async (formData) => {
                await updateClientAction(formData);
                setIsOpen(false);
              }}
              className="space-y-4"
            >
              <input type="hidden" name="id" value={client.id} />

              <div>
                <label className="text-sm font-medium">Nombre</label>
                <input
                  name="name"
                  defaultValue={client.name}
                  className="w-full rounded-lg border p-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Slug (URL)</label>
                <input
                  name="slug"
                  defaultValue={client.slug}
                  className="w-full rounded-lg border p-2 text-sm"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-black py-2 text-sm font-medium text-white"
                >
                  Guardar cambios
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 rounded-lg bg-zinc-200 py-2 text-sm font-medium text-zinc-900"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
