import { AppShell } from "@/components/app-shell";
import { getTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const context = await getTenantContext();

  return (
    <div className="min-h-screen w-full bg-zinc-100">
      <AppShell role={context.role} clientName={context.client?.name}>
        {children}
      </AppShell>
    </div>
  );
}


