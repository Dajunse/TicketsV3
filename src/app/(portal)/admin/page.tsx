import { CredentialType } from "@prisma/client";
import Link from "next/link";
import {
  assignServiceToClientAction,
  createSecureNoteAction,
  createServiceCatalogAction,
  rotateClientPublicTicketTokenAction,
} from "@/actions/admin-actions";
import { CreateClientModal } from "@/components/create-client-modal";
import { CreateClientUserModal } from "@/components/create-client-user-modal";
import { EditClientModal } from "@/components/EditClientModal";
import { EditClientUserModal } from "@/components/edit-client-user-modal";
import { EditServiceCatalogModal } from "@/components/edit-service-catalog-modal";
import { PageTitle } from "@/components/page-title";
import { ResetClientPasswordForm } from "@/components/reset-client-password-form";
import { requireAdmin } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function AdminPage() {
  await requireAdmin();

  const [clients, services, memberships, clientServiceAssignments, recentSecureNotes, tokenNotes] =
    await Promise.all([
      prisma.client.findMany({
        orderBy: { name: "asc" },
        include: {
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  isActive: true,
                },
              },
            },
          },
          services: {
            select: { id: true },
          },
        },
      }),
      prisma.serviceCatalog.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              clients: true,
            },
          },
        },
      }),
      prisma.clientUser.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
            },
          },
        },
      }),
      prisma.clientService.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: { name: true },
          },
          service: {
            select: { name: true },
          },
        },
      }),
      prisma.secureNote.findMany({
        include: {
          client: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.secureNote.findMany({
        where: {
          title: "Public ticket URL token",
        },
        select: {
          clientId: true,
          ciphertext: true,
          iv: true,
          authTag: true,
        },
      }),
    ]);

  const tokenByClient = new Map<string, string>();
  for (const note of tokenNotes) {
    try {
      const token = decryptSecret({
        ciphertext: note.ciphertext,
        iv: note.iv,
        authTag: note.authTag,
      });
      tokenByClient.set(note.clientId, token);
    } catch {
      tokenByClient.set(note.clientId, "[configure CREDENTIALS_ENCRYPTION_KEY]");
    }
  }

  return (
    <section className="space-y-6">
      <PageTitle title="Administracion" subtitle="Gestion separada de clientes, usuarios y servicios." />

      <article className="rounded-[20px] border border-transparent bg-gradient-to-b from-zinc-950 via-zinc-950 to-black p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="#clientes"
              className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 hover:bg-zinc-100"
            >
              Clientes ({clients.length})
            </a>
            <a
              href="#usuarios"
              className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 hover:bg-zinc-100"
            >
              Usuarios ({memberships.length})
            </a>
            <a
              href="#servicios"
              className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 hover:bg-zinc-100"
            >
              Servicios ({services.length})
            </a>
            <a
              href="#credenciales"
              className="rounded-[20px] border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 hover:bg-zinc-100"
            >
              Credenciales
            </a>
          </div>
          <span className="text-xs text-zinc-300">Panel modular para editar cada dominio por separado.</span>
        </div>
      </article>

      <article id="clientes" className="rounded-xl border-4 border-sky-400 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-title text-lg text-zinc-900">Clientes</h2>
            <p className="text-sm text-zinc-600">Alta y edicion de clientes en un solo bloque.</p>
          </div>
          <CreateClientModal />
        </div>

        <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="min-w-[820px] w-full text-sm">
              <thead className="bg-zinc-100 text-xs uppercase tracking-[0.08em] text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Cliente</th>
                  <th className="px-3 py-2 text-left font-medium">Slug</th>
                  <th className="px-3 py-2 text-center font-medium">Usuarios</th>
                  <th className="px-3 py-2 text-center font-medium">Servicios</th>
                  <th className="px-3 py-2 text-left font-medium">Portal publico</th>
                  <th className="px-3 py-2 text-center font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const publicToken = tokenByClient.get(client.id) ?? "";
                  const publicTicketPath = `/public/ticket/${client.publicTicketSlug}?token=${publicToken || "[token]"}`;
                  const canOpenPublicLink = Boolean(publicToken) && !publicToken.startsWith("[");

                  return (
                    <tr key={client.id} className="border-t border-zinc-200 align-top">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-zinc-900">{client.name}</p>
                        <p className="text-xs text-zinc-500">Creado: {formatDate(client.createdAt)}</p>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-700">{client.slug}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex min-w-6 justify-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                          {client.users.length}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex min-w-6 justify-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                          {client.services.length}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={rotateClientPublicTicketTokenAction}>
                            <input type="hidden" name="clientId" value={client.id} />
                            <button
                              type="submit"
                              className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                            >
                              {canOpenPublicLink ? "Regenerar token" : "Generar token"}
                            </button>
                          </form>
                          {canOpenPublicLink ? (
                            <Link
                              href={publicTicketPath}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                              title="Abrir portal publico"
                              aria-label={`Abrir portal publico ${client.name}`}
                            >
                              <svg viewBox="0 0 640 640" className="h-4 w-4" aria-hidden="true">
                                <path
                                  d="M354.4 83.8C359.4 71.8 371.1 64 384 64L544 64C561.7 64 576 78.3 576 96L576 256C576 268.9 568.2 280.6 556.2 285.6C544.2 290.6 530.5 287.8 521.3 278.7L464 221.3L310.6 374.6C298.1 387.1 277.8 387.1 265.3 374.6C252.8 362.1 252.8 341.8 265.3 329.3L418.7 176L361.4 118.6C352.2 109.4 349.5 95.7 354.5 83.7zM64 240C64 195.8 99.8 160 144 160L224 160C241.7 160 256 174.3 256 192C256 209.7 241.7 224 224 224L144 224C135.2 224 128 231.2 128 240L128 496C128 504.8 135.2 512 144 512L400 512C408.8 512 416 504.8 416 496L416 416C416 398.3 430.3 384 448 384C465.7 384 480 398.3 480 416L480 496C480 540.2 444.2 576 400 576L144 576C99.8 576 64 540.2 64 496L64 240z"
                                  fill="currentColor"
                                />
                              </svg>
                            </Link>
                          ) : (
                            <span className="text-xs text-amber-700">Sin token valido</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <EditClientModal client={{ id: client.id, name: client.name, slug: client.slug }} />
                      </td>
                    </tr>
                  );
                })}
                {clients.length === 0 ? (
                  <tr className="border-t border-zinc-200">
                    <td colSpan={6} className="px-3 py-4 text-sm text-zinc-500">
                      Aun no hay clientes registrados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
        </div>
      </article>

      <article id="usuarios" className="rounded-xl border-4 border-violet-400 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-title text-lg text-zinc-900">Usuarios</h2>
            <p className="text-sm text-zinc-600">Administracion de cuentas cliente separada de clientes y servicios.</p>
          </div>
          <CreateClientUserModal clients={clients.map((client) => ({ id: client.id, name: client.name }))} />
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-zinc-100 text-xs uppercase tracking-[0.08em] text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Cliente</th>
                <th className="px-3 py-2 text-left font-medium">Usuario</th>
                <th className="px-3 py-2 text-left font-medium">Correo</th>
                <th className="px-3 py-2 text-center font-medium">Estado</th>
                <th className="px-3 py-2 text-left font-medium">Seguridad</th>
                <th className="px-3 py-2 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((membership) => (
                <tr key={membership.id} className="border-t border-zinc-200 align-top">
                  <td className="px-3 py-2.5 text-zinc-700">{membership.client.name}</td>
                  <td className="px-3 py-2.5 font-medium text-zinc-900">{membership.user.name || "Sin nombre"}</td>
                  <td className="px-3 py-2.5 text-zinc-700">{membership.user.email}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                        membership.user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {membership.user.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <ResetClientPasswordForm clientId={membership.clientId} userId={membership.userId} compact />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <EditClientUserModal
                      user={{
                        id: membership.user.id,
                        name: membership.user.name,
                        email: membership.user.email,
                        isActive: membership.user.isActive,
                        clientName: membership.client.name,
                      }}
                    />
                  </td>
                </tr>
              ))}
              {memberships.length === 0 ? (
                <tr className="border-t border-zinc-200">
                  <td colSpan={6} className="px-3 py-4 text-sm text-zinc-500">
                    Aun no hay usuarios cliente registrados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>

      <article id="servicios" className="rounded-xl border-4 border-emerald-400 bg-white p-4">
        <div className="mb-4">
          <h2 className="font-title text-lg text-zinc-900">Servicios</h2>
          <p className="text-sm text-zinc-600">Catalogo y asignaciones gestionados por separado.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <form action={createServiceCatalogAction} className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Nuevo servicio</p>
            <input name="name" required className="w-full rounded-lg border border-zinc-200 px-3 py-2" placeholder="Hosting" />
            <textarea name="description" rows={3} className="w-full rounded-lg border border-zinc-200 px-3 py-2" />
            <button type="submit" className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white">
              Guardar servicio
            </button>
          </form>

          <form action={assignServiceToClientAction} className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs uppercase tracking-[0.08em] text-zinc-500">Asignar servicio a cliente</p>
            <select name="clientId" required className="w-full rounded-lg border border-zinc-200 px-3 py-2">
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <select name="serviceId" required className="w-full rounded-lg border border-zinc-200 px-3 py-2">
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            <input name="notes" className="w-full rounded-lg border border-zinc-200 px-3 py-2" placeholder="Notas del servicio" />
            <button type="submit" className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white">
              Asignar servicio
            </button>
          </form>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-[820px] w-full text-sm">
            <thead className="bg-zinc-100 text-xs uppercase tracking-[0.08em] text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Servicio</th>
                <th className="px-3 py-2 text-left font-medium">Descripcion</th>
                <th className="px-3 py-2 text-center font-medium">Estado</th>
                <th className="px-3 py-2 text-center font-medium">Clientes</th>
                <th className="px-3 py-2 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} className="border-t border-zinc-200 align-top">
                  <td className="px-3 py-2.5 font-medium text-zinc-900">{service.name}</td>
                  <td className="px-3 py-2.5 text-zinc-700">{service.description || "Sin descripcion"}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                        service.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {service.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-flex min-w-6 justify-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                      {service._count.clients}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <EditServiceCatalogModal
                      service={{
                        id: service.id,
                        name: service.name,
                        description: service.description,
                        isActive: service.isActive,
                      }}
                    />
                  </td>
                </tr>
              ))}
              {services.length === 0 ? (
                <tr className="border-t border-zinc-200">
                  <td colSpan={5} className="px-3 py-4 text-sm text-zinc-500">
                    Aun no hay servicios en catalogo.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-zinc-100 text-xs uppercase tracking-[0.08em] text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Cliente</th>
                <th className="px-3 py-2 text-left font-medium">Servicio</th>
                <th className="px-3 py-2 text-center font-medium">Estado</th>
                <th className="px-3 py-2 text-left font-medium">Notas</th>
              </tr>
            </thead>
            <tbody>
              {clientServiceAssignments.map((assignment) => (
                <tr key={assignment.id} className="border-t border-zinc-200">
                  <td className="px-3 py-2.5 text-zinc-700">{assignment.client.name}</td>
                  <td className="px-3 py-2.5 text-zinc-700">{assignment.service.name}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                        assignment.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {assignment.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-600">{assignment.notes || "Sin notas"}</td>
                </tr>
              ))}
              {clientServiceAssignments.length === 0 ? (
                <tr className="border-t border-zinc-200">
                  <td colSpan={4} className="px-3 py-4 text-sm text-zinc-500">
                    Aun no hay asignaciones de servicios.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>

      <article id="credenciales" className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-4">
          <h2 className="font-title text-lg text-zinc-900">Credenciales y notas seguras</h2>
          <p className="text-sm text-zinc-600">Registro cifrado para accesos y notas internas.</p>
        </div>

        <form action={createSecureNoteAction} className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 md:grid-cols-2">
          <select name="clientId" required className="rounded-lg border border-zinc-200 px-3 py-2">
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <select name="type" required className="rounded-lg border border-zinc-200 px-3 py-2">
            {Object.values(CredentialType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input name="title" required className="rounded-lg border border-zinc-200 px-3 py-2" placeholder="Titulo" />
          <textarea
            name="plainText"
            rows={3}
            required
            className="rounded-lg border border-zinc-200 px-3 py-2"
            placeholder="Texto seguro"
          />
          <div className="md:col-span-2">
            <button type="submit" className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white">
              Guardar nota cifrada
            </button>
          </div>
        </form>

        {recentSecureNotes.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-zinc-100 text-xs uppercase tracking-[0.08em] text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Fecha</th>
                  <th className="px-3 py-2 text-left font-medium">Cliente</th>
                  <th className="px-3 py-2 text-left font-medium">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium">Titulo</th>
                </tr>
              </thead>
              <tbody>
                {recentSecureNotes.map((note) => (
                  <tr key={note.id} className="border-t border-zinc-200">
                    <td className="px-3 py-2.5 text-zinc-600">{formatDate(note.createdAt)}</td>
                    <td className="px-3 py-2.5 text-zinc-700">{note.client.name}</td>
                    <td className="px-3 py-2.5 text-zinc-700">{note.type}</td>
                    <td className="px-3 py-2.5 text-zinc-900">{note.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">Aun no hay notas seguras registradas.</p>
        )}
      </article>
    </section>
  );
}
