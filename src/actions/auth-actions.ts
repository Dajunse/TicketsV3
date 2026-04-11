"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { clearSession, getCurrentUser, loginWithPassword } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function loginAction(_: { error?: string } | undefined, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Credenciales invalidas." };
  }

  const user = await loginWithPassword(parsed.data.email, parsed.data.password);
  if (!user) {
    return { error: "Correo o contrasena incorrectos." };
  }

  const clientId = user.role === "CLIENT" ? user.memberships[0]?.clientId ?? null : null;

  await createAuditLog({
    actorUserId: user.id,
    actorRole: user.role,
    clientId,
    eventType: "AUTH_LOGIN",
    entityType: "SESSION",
    message: `Inicio de sesion de ${user.email}`,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) {
    const clientId = user.role === "CLIENT" ? user.memberships[0]?.clientId ?? null : null;
    await createAuditLog({
      actorUserId: user.id,
      actorRole: user.role,
      clientId,
      eventType: "AUTH_LOGOUT",
      entityType: "SESSION",
      message: `Cierre de sesion de ${user.email}`,
    });
  }

  await clearSession();
  redirect("/login");
}

