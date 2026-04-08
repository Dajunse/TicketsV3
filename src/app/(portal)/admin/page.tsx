import { CredentialType } from "@prisma/client";
import {
  assignServiceToClientAction,
  createClientAction,
  createClientUserAction,
  createSecureNoteAction,
  createServiceCatalogAction,
} from "@/actions/admin-actions";
import { PageTitle } from "@/components/page-title";
import { requireAdmin } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function AdminPage() {
  await requireAdmin();

  const [clients, services, notes] = await Promise.all([
    prisma.client.findMany({
      orderBy: { name: "asc" },
      include: {
        users: {
          include: { user: true },
        },
        services: {
          include: { service: true },
        },
      },
    }),
    prisma.serviceCatalog.findMany({ orderBy: { name: "asc" } }),
    prisma.secureNote.findMany({
      include: { client: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <section className="space-y-6">
      <PageTitle title="Administracion" subtitle="Gestion central de clientes, servicios y accesos." />

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 font-title text-lg text-zinc-900">Crear cliente</h2>
          <form action={createClientAction} className="space-y-3">
            <input name="name" required className="w-full rounded-lg px-3 py-2" placeholder="Blair" />
            <input name="slug" required className="w-full rounded-lg px-3 py-2" placeholder="blair" />
            <button type="submit" className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
              Crear
            </button>
          </form>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 font-title text-lg text-zinc-900">Crear servicio</h2>
          <form action={createServiceCatalogAction} className="space-y-3">
            <input name="name" required className="w-full rounded-lg px-3 py-2" placeholder="Hosting" />
            <textarea name="description" rows={3} className="w-full rounded-lg px-3 py-2" />
            <button type="submit" className="rounded-lg border border-zinc-300 bg-black px-4 py-2 text-sm text-white">
              Guardar catalogo
            </button>
          </form>
        </article>
      </div>

      <article className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 font-title text-lg text-zinc-900">Alta de usuario cliente</h2>
        <form action={createClientUserAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select name="clientId" required className="rounded-lg px-3 py-2">
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <input name="name" required className="rounded-lg px-3 py-2" placeholder="Nombre" />
          <input name="email" type="email" required className="rounded-lg px-3 py-2" placeholder="correo@dominio.com" />
          <input name="password" type="password" required className="rounded-lg px-3 py-2" placeholder="Contrasena temporal" />
          <div className="xl:col-span-4">
            <button type="submit" className="rounded-lg border border-zinc-300 bg-black px-4 py-2 text-sm text-white">
              Crear usuario
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 font-title text-lg text-zinc-900">Asignar servicio a cliente</h2>
        <form action={assignServiceToClientAction} className="grid gap-3 md:grid-cols-3">
          <select name="clientId" required className="rounded-lg px-3 py-2">
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <select name="serviceId" required className="rounded-lg px-3 py-2">
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <input name="notes" className="rounded-lg px-3 py-2" placeholder="Notas del servicio" />
          <div className="md:col-span-3">
            <button type="submit" className="rounded-lg border border-zinc-300 bg-black px-4 py-2 text-sm text-white">
              Asignar
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 font-title text-lg text-zinc-900">Credenciales y notas seguras</h2>
        <form action={createSecureNoteAction} className="grid gap-3 md:grid-cols-2">
          <select name="clientId" required className="rounded-lg px-3 py-2">
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <select name="type" required className="rounded-lg px-3 py-2">
            {Object.values(CredentialType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input name="title" required className="rounded-lg px-3 py-2" placeholder="Titulo" />
          <textarea name="plainText" rows={3} required className="rounded-lg px-3 py-2" placeholder="Texto seguro" />
          <div className="md:col-span-2">
            <button type="submit" className="rounded-lg border border-zinc-300 bg-black px-4 py-2 text-sm text-white">
              Guardar nota cifrada
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 font-title text-lg text-zinc-900">Clientes activos</h2>
        <div className="space-y-3">
          {clients.map((client) => {
            const tokenNote = notes.find(
              (note) => note.clientId === client.id && note.title === "Public ticket URL token",
            );
            let publicToken = "";
            if (tokenNote) {
              try {
                publicToken = decryptSecret({
                  ciphertext: tokenNote.ciphertext,
                  iv: tokenNote.iv,
                  authTag: tokenNote.authTag,
                });
              } catch {
                publicToken = "[configure CREDENTIALS_ENCRYPTION_KEY]";
              }
            }

            return (
              <div key={client.id} className="rounded-lg border border-zinc-200 p-3">
                <p className="font-medium text-zinc-900">{client.name}</p>
                <p className="text-xs text-zinc-500">Slug: {client.slug}</p>
                <p className="mt-1 text-xs text-zinc-600">
                  URL publica tickets: /support/{client.publicTicketSlug}/{publicToken || "[token]"}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Usuarios: {client.users.length} - Servicios: {client.services.length}
                </p>
                <p className="mt-1 text-xs text-zinc-500">Creado: {formatDate(client.createdAt)}</p>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}
