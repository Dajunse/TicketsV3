import Link from "next/link";
import { PageTransition } from "@/components/page-transition";

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-zinc-950">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-16">
        <PageTransition className="w-full">
          <section className="space-y-8">
            <div className="inline-flex items-center rounded-full border border-zinc-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-300">
              Tian Studio
            </div>
            <div className="space-y-4">
              <h1 className="font-title text-4xl leading-tight text-white md:text-6xl">
                <span className="font-bold">Portal</span>{" "}
                <span className="text-3xl font-thin text-zinc-300 md:text-5xl">del Usuario</span>
              </h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-[20px] bg-white px-5 py-2.5 text-sm font-medium text-black shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out hover:bg-zinc-100 hover:translate-y-[1px] hover:shadow-[0_6px_16px_rgba(0,0,0,0.30)] active:translate-y-[2px] active:shadow-[0_3px_10px_rgba(0,0,0,0.24)]"
              >
                Inicia sesion
              </Link>
            </div>
          </section>
        </PageTransition>
      </div>
    </main>
  );
}
