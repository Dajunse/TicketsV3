import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { PageTransition } from "@/components/page-transition";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-zinc-950 px-6">
      <PageTransition className="w-full max-w-md">
        <section className="space-y-6 rounded-[25px] border border-zinc-800 bg-black p-6 shadow-[0_24px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)]">
          <div className="space-y-2">
            <h1 className="font-title text-2xl text-white">Inicia sesion</h1>
          </div>
          <LoginForm />
        </section>
      </PageTransition>
    </main>
  );
}
