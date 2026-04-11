import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "tms_session";
const SESSION_TTL_DAYS = 15;

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sessionExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
  return expiresAt;
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = sessionExpiryDate();

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = sha256(token);
  const now = new Date();
  const session = await prisma.session.findFirst({
    where: { tokenHash, expiresAt: { gt: now } },
    include: {
      user: {
        include: {
          memberships: {
            include: {
              client: true,
            },
          },
        },
      },
    },
  });

  if (!session || !session.user.isActive) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { lastSeenAt: now },
  });

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) {
    redirect("/dashboard");
  }
  return user;
}

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      memberships: {
        select: {
          clientId: true,
        },
      },
    },
  });
  if (!user || !user.isActive) {
    return null;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return null;
  }

  await createSession(user.id);
  return user;
}
