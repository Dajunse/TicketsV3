import { Priority, TicketStatus } from "@prisma/client";
import Link from "next/link";
import {
  addTicketMessageAction,
  createAuthenticatedTicketAction,
  deleteTicketAction,
  updateTicketStatusAction,
} from "@/actions/ticket-actions";
import { PageTitle } from "@/components/page-title";
import { StatusBadge } from "@/components/status-badge";
import { decryptSecret } from "@/lib/crypto";
import { priorityLabel, ticketOriginLabel, ticketStatusLabel } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { formatDateTime } from "@/lib/utils";

export default async function TicketsPage() {
  const context = await getTenantContext();
  const where = context.isAdmin
    ? context.clientId
      ? { clientId: context.clientId }
      : undefined
    : context.clientId
      ? { clientId: context.clientId, status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } }
      : { id: "__no_client__" };

  const [tickets, clients, publicTokenNote] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: { author: true },
        },
        client: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
    context.isAdmin ? prisma.client.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    context.isAdmin || !context.clientId
      ? Promise.resolve(null)
      : prisma.secureNote.findFirst({
          where: {
            clientId: context.clientId,
            title: "Public ticket URL token",
          },
          orderBy: { createdAt: "desc" },
        }),
  ]);

  let publicTicketPath = "";
  if (!context.isAdmin && context.client && publicTokenNote) {
    try {
      const token = decryptSecret({
        ciphertext: publicTokenNote.ciphertext,
        iv: publicTokenNote.iv,
        authTag: publicTokenNote.authTag,
      });
      if (token) {
        publicTicketPath = `/public/ticket/${context.client.publicTicketSlug}?token=${token}`;
      }
    } catch {
      publicTicketPath = "";
    }
  }

  return (
    <section className="space-y-6">
      <PageTitle title="Tickets" subtitle="Soporte por cliente con historial y seguimiento." />

      {context.isAdmin ? (
        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 font-title text-lg text-zinc-900">Nuevo ticket</h2>
          <form action={createAuthenticatedTicketAction} className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Cliente</label>
              <select name="clientId" required className="w-full rounded-lg px-3 py-2">
                {(context.clientId ? clients.filter((c) => c.id === context.clientId) : clients).map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Categoria</label>
              <input name="category" required className="w-full rounded-lg px-3 py-2" placeholder="Soporte tecnico" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-zinc-700">Asunto</label>
              <input name="subject" required className="w-full rounded-lg px-3 py-2" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-zinc-700">Descripcion</label>
              <textarea name="description" required rows={4} className="w-full rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Prioridad</label>
              <select name="priority" defaultValue={Priority.MEDIUM} className="w-full rounded-lg px-3 py-2">
                {Object.values(Priority).map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabel(priority)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white" type="submit">
                Crear ticket
              </button>
            </div>
          </form>
        </article>
      ) : (
        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="font-title text-lg text-zinc-900">Levantar ticket</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Usa el portal publico para crear nuevos tickets. Aqui solo se muestran tus tickets abiertos.
          </p>
          {publicTicketPath ? (
            <Link
              href={publicTicketPath}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Ir al portal publico de tickets
            </Link>
          ) : (
            <p className="mt-3 text-xs text-amber-700">
              Tu URL publica de tickets aun no esta disponible. Solicita a tu administrador generar el token.
            </p>
          )}
        </article>
      )}

      <article className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="font-title text-lg text-zinc-900">Historial</h2>
        {tickets.map((ticket) => (
          <div key={ticket.id} className="rounded-lg border border-zinc-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-zinc-900">{ticket.subject}</p>
                <p className="text-xs text-zinc-500">
                  {ticket.client.name} - {ticket.category} - {ticketOriginLabel(ticket.origin)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  tone={
                    ticket.status === "CLOSED"
                      ? "success"
                      : ticket.status === "IN_PROGRESS"
                        ? "info"
                        : "warning"
                  }
                >
                  {ticketStatusLabel(ticket.status)}
                </StatusBadge>
                <StatusBadge
                  tone={
                    ticket.priority === "URGENT" || ticket.priority === "HIGH"
                      ? "danger"
                      : ticket.priority === "MEDIUM"
                        ? "info"
                        : "neutral"
                  }
                >
                  {priorityLabel(ticket.priority)}
                </StatusBadge>
                {context.isAdmin ? (
                  <div className="flex items-center gap-2">
                    <form action={updateTicketStatusAction} className="flex items-center gap-2">
                      <input type="hidden" name="ticketId" value={ticket.id} />
                      <select name="status" className="rounded-md px-2 py-1 text-xs" defaultValue={ticket.status}>
                        {Object.values(TicketStatus).map((status) => (
                          <option key={status} value={status}>
                            {ticketStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="rounded-md border border-zinc-300 px-2 py-1 text-xs">
                        Guardar
                      </button>
                    </form>
                    <form action={deleteTicketAction}>
                      <input type="hidden" name="ticketId" value={ticket.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100"
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            </div>
            <p className="mt-2 text-sm text-zinc-700">{ticket.description}</p>

            {ticket.requesterName || ticket.requesterContact ? (
              <p className="mt-1 text-xs text-zinc-500">
                Reportado por: {ticket.requesterName} ({ticket.requesterContact})
              </p>
            ) : null}

            <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3">
              {ticket.messages.map((message) => (
                <div key={message.id} className="rounded-md border border-zinc-200 p-2">
                  <p className="text-sm text-zinc-800">{message.body}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {message.author?.name ?? "Sistema"} - {formatDateTime(message.createdAt)}
                    {message.isInternalNote ? " - Nota interna" : ""}
                  </p>
                </div>
              ))}
              <form action={addTicketMessageAction} className="space-y-2">
                <input type="hidden" name="ticketId" value={ticket.id} />
                <textarea
                  required
                  name="body"
                  rows={2}
                  className="w-full rounded-md px-3 py-2 text-sm"
                  placeholder="Responder ticket..."
                />
                {context.isAdmin ? (
                  <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
                    <input type="checkbox" name="isInternal" value="true" />
                    Guardar como nota interna
                  </label>
                ) : null}
                <button className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm" type="submit">
                  Enviar mensaje
                </button>
              </form>
            </div>
          </div>
        ))}
        {tickets.length === 0 ? <p className="text-sm text-zinc-500">No hay tickets registrados.</p> : null}
      </article>
    </section>
  );
}
