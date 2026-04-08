import Link from "next/link";
import { Role } from "@prisma/client";
import { logoutAction } from "@/actions/auth-actions";
import { roleLabel } from "@/lib/labels";

export function AppShell({
  role,
  clientName,
  children,
}: {
  role: Role;
  clientName?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full gap-4 px-3 py-4 sm:gap-6 sm:px-4 md:px-6 lg:px-8 xl:px-10">
      <aside className="hidden w-60 shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 lg:block">
        <div className="space-y-1 border-b border-zinc-800 pb-4">
          <p className="font-title text-lg text-white">TianMake Portal</p>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{roleLabel(role)}</p>
          {clientName ? <p className="text-sm text-zinc-300">{clientName}</p> : null}
        </div>
        <nav className="mt-4 space-y-1 text-sm">
          <Link className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-900" href="/dashboard">
            Inicio
          </Link>
          <Link className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-900" href="/activities">
            Actividades
          </Link>
          <Link className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-900" href="/tickets">
            Tickets
          </Link>
          <Link className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-900" href="/documents">
            Documentos
          </Link>
          {role === "ADMIN" ? (
            <Link className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-900" href="/admin">
              Administracion
            </Link>
          ) : null}
        </nav>
        <form action={logoutAction} className="mt-6">
          <button
            className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900"
            type="submit"
          >
            Cerrar sesion
          </button>
        </form>
      </aside>
      <main className="portal-light min-w-0 flex-1 space-y-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 md:p-7">
        {children}
      </main>
    </div>
  );
}
