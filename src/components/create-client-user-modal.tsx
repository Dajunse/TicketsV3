"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClientUserAction } from "@/actions/admin-actions";

type ClientOption = {
  id: string;
  name: string;
};

type CreateClientUserModalProps = {
  clients: ClientOption[];
};

export function CreateClientUserModal({ clients }: CreateClientUserModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setErrorMessage("");
    startTransition(async () => {
      try {
        await createClientUserAction(formData);
        setIsOpen(false);
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "No se pudo crear el usuario.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={clients.length === 0}
        className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Nuevo usuario
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl border border-zinc-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-title text-lg text-zinc-900">Crear usuario cliente</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                Cerrar
              </button>
            </div>

            <form action={handleSubmit} className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Cliente</label>
                <select name="clientId" required className="w-full rounded-lg border border-zinc-200 px-3 py-2">
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Nombre</label>
                <input
                  name="name"
                  required
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2"
                  placeholder="Nombre"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Correo</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2"
                  placeholder="correo@dominio.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-700">Contrasena temporal</label>
                <input
                  name="password"
                  type="password"
                  required
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2"
                  placeholder="Minimo 10 caracteres"
                />
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
                  {isPending ? "Guardando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

