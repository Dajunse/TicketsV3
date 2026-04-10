import Link from "next/link";
import { redirect } from "next/navigation";
import { createDocumentAction, deleteDocumentAction } from "@/actions/admin-actions";
import { PageTitle } from "@/components/page-title";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { formatDate } from "@/lib/utils";

export default async function DocumentsPage() {
  const context = await getTenantContext();
  if (!context.isAdmin) {
    redirect("/dashboard");
  }

  const where = context.clientId ? { clientId: context.clientId } : undefined;

  const [documents, clients] = await Promise.all([
    prisma.document.findMany({
      where,
      include: { client: true },
      orderBy: { createdAt: "desc" },
    }),
    context.isAdmin ? prisma.client.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <section className="space-y-6">
      <PageTitle title="Documentos" subtitle="Archivos privados por cuenta de cliente." />

      {context.isAdmin ? (
        <article className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 font-title text-lg text-zinc-900">Subir documento (metadata)</h2>
          <form action={createDocumentAction} className="grid gap-3 md:grid-cols-2">
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
              <label className="mb-1 block text-sm text-zinc-700">Nombre del archivo</label>
              <input name="filename" required className="w-full rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Titulo</label>
              <input name="title" required className="w-full rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-700">Tipo MIME (opcional)</label>
              <input name="mimeType" className="w-full rounded-lg px-3 py-2" placeholder="application/pdf" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-zinc-700">URL o ruta de almacenamiento</label>
              <input
                name="storagePath"
                required
                className="w-full rounded-lg px-3 py-2"
                placeholder="https://bucket/archivo.pdf"
              />
            </div>
            <div className="md:col-span-2">
              <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white" type="submit">
                Guardar documento
              </button>
            </div>
          </form>
        </article>
      ) : null}

      <article className="rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 font-title text-lg text-zinc-900">Disponibles</h2>
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3">
              <div>
                <p className="font-medium text-zinc-800">{doc.title}</p>
                <p className="text-xs text-zinc-500">
                  {doc.client.name} - {formatDate(doc.createdAt)} - {doc.filename}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={doc.storagePath}
                  target="_blank"
                  className="rounded-md border border-zinc-300 bg-black px-3 py-1.5 text-sm text-white"
                >
                  Descargar
                </Link>
                {context.isAdmin ? (
                  <form action={deleteDocumentAction}>
                    <input type="hidden" name="documentId" value={doc.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
                    >
                      Eliminar
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
          {documents.length === 0 ? <p className="text-sm text-zinc-500">No hay documentos cargados.</p> : null}
        </div>
      </article>
    </section>
  );
}
