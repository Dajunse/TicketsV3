"use client";

import { useActionState, use } from "react";
import { createPublicTicketAction } from "@/actions/ticket-actions";
import { Priority } from "@prisma/client";

export default function PublicTicketForm({
  params,
  clientName,
  token,
}: {
  params: Promise<{ slug: string }>;
  clientName: string;
  token: string;
}) {
  const { slug } = use(params); // Desenvuelve la promesa del slug

  const [state, formAction, isPending] = useActionState(
    createPublicTicketAction,
    {
      ok: false,
      error: null,
    },
  );

  if (state.ok) {
    return (
      <div className="p-6 text-center bg-white rounded-xl border border-zinc-200 shadow-sm">
        <h2 className="text-xl font-bold text-zinc-900">¡Ticket creado!</h2>
        <p className="text-sm text-zinc-500">
          Nos pondremos en contacto pronto.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
      <h1 className="text-xl font-bold text-zinc-900 mb-1">Nuevo Ticket</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Cliente:{" "}
        <span className="font-semibold text-zinc-900">{clientName}</span>
      </p>

      {state.error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
          {state.error}
        </p>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="requesterName" value="Cliente Público" />
        <input type="hidden" name="requesterContact" value="via-link-publico" />
        <input type="hidden" name="category" value="General" />
        <input type="hidden" name="priority" value={Priority.MEDIUM} />
        <input
          type="text"
          name="companyName"
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
        />

        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">
            Asunto
          </label>
          <input
            name="subject"
            required
            className="w-full rounded-lg border border-zinc-300 p-2 text-sm outline-none focus:ring-2 focus:ring-black transition-all"
            placeholder="¿En qué podemos ayudarte?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-zinc-700">
            Descripción
          </label>
          <textarea
            name="description"
            required
            rows={4}
            className="w-full rounded-lg border border-zinc-300 p-2 text-sm outline-none focus:ring-2 focus:ring-black transition-all"
            placeholder="Describe el problema detalladamente..."
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-white text-black border py-2 rounded-lg font-medium hover:bg-zinc-800 hover:text-white transition-colors disabled:bg-zinc-400 disabled:cursor-not-allowed"
        >
          {isPending ? "Enviando..." : "Crear Ticket"}
        </button>
      </form>
    </div>
  );
}
