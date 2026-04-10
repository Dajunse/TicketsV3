"use client";

import { useActionState } from "react";
import { Priority } from "@prisma/client";
import { createPublicTicketAction } from "@/actions/ticket-actions";

type Props = {
  slug: string;
  clientName: string;
  token: string;
};

export default function PublicTicketForm({ slug, clientName, token }: Props) {
  const [state, formAction, isPending] = useActionState(createPublicTicketAction, {
    ok: false,
    error: null,
  });

  if (state.ok) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-xl font-bold text-zinc-900">Ticket creado</h2>
        <p className="text-sm text-zinc-500">Nos pondremos en contacto pronto.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="mb-1 text-xl font-bold text-zinc-900">Nuevo Ticket</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Cliente: <span className="font-semibold text-zinc-900">{clientName}</span>
      </p>

      {state.error ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-600">{state.error}</p>
      ) : null}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="requesterName" value="Cliente Publico" />
        <input type="hidden" name="requesterContact" value="via-link-publico" />
        <input type="hidden" name="category" value="General" />
        <input type="hidden" name="priority" value={Priority.MEDIUM} />
        <input type="text" name="companyName" className="hidden" tabIndex={-1} autoComplete="off" />

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Asunto</label>
          <input
            name="subject"
            required
            className="w-full rounded-lg border border-zinc-300 p-2 text-sm outline-none transition-all focus:ring-2 focus:ring-black"
            placeholder="En que podemos ayudarte?"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Descripcion</label>
          <textarea
            name="description"
            required
            rows={4}
            className="w-full rounded-lg border border-zinc-300 p-2 text-sm outline-none transition-all focus:ring-2 focus:ring-black"
            placeholder="Describe el problema detalladamente..."
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg border bg-white py-2 font-medium text-black transition-colors hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isPending ? "Enviando..." : "Crear Ticket"}
        </button>
      </form>
    </div>
  );
}
