import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6">
      <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center">
        <h1 className="font-title text-3xl text-white">404</h1>
        <p className="text-zinc-400">No encontramos la página solicitada.</p>
        <Link className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200" href="/">
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
