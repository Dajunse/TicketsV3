import { notFound } from "next/navigation";
import { PublicTicketForm } from "@/components/public-ticket-form";
import { resolvePublicClient } from "@/lib/public-ticket";

export const dynamic = "force-dynamic";

type Params = {
  slug: string;
  token: string;
};

export default async function PublicSupportPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, token } = await params;
  const client = await resolvePublicClient(slug, token);

  if (!client) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <section className="w-full space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 md:p-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Soporte {client.name}</p>
          <h1 className="font-title text-2xl text-white">Reportar incidencia</h1>
          <p className="text-sm text-zinc-400">
            Formulario rápido para crear un ticket sin iniciar sesión.
          </p>
        </div>
        <PublicTicketForm slug={slug} token={token} />
      </section>
    </main>
  );
}
