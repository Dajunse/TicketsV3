"use client";

import { useActionState } from "react";
import { Priority } from "@prisma/client";
import { createPublicTicketAction, type PublicTicketFormState } from "@/actions/ticket-actions";
import { priorityLabel } from "@/lib/labels";

const initialState: PublicTicketFormState = { ok: false, error: null };

export function PublicTicketForm({ slug, token }: { slug: string; token: string }) {
  const [state, formAction, pending] = useActionState(createPublicTicketAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="token" value={token} />
      <input
        type="text"
        name="companyName"
        autoComplete="off"
        tabIndex={-1}
        className="hidden"
        aria-hidden="true"
      />

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-zinc-300">Nombre</label>
          <input name="requesterName" required className="w-full rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-300">Correo o telefono</label>
          <input name="requesterContact" required className="w-full rounded-lg px-3 py-2" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-zinc-300">Asunto</label>
        <input name="subject" required className="w-full rounded-lg px-3 py-2" />
      </div>

      <div>
        <label className="mb-1 block text-sm text-zinc-300">Descripcion</label>
        <textarea name="description" required rows={5} className="w-full rounded-lg px-3 py-2" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-zinc-300">Categoria</label>
          <input name="category" required className="w-full rounded-lg px-3 py-2" placeholder="Soporte tecnico" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-300">Prioridad</label>
          <select defaultValue={Priority.MEDIUM} name="priority" className="w-full rounded-lg px-3 py-2">
            {Object.values(Priority).map((priority) => (
              <option key={priority} value={priority}>
                {priorityLabel(priority)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
      {state.ok ? (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-200">
          Ticket creado correctamente. Te responderemos lo antes posible.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Crear ticket"}
      </button>
    </form>
  );
}
