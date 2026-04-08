import crypto from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generatePublicTicketToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function resolvePublicClient(slug: string, token: string) {
  const client = await prisma.client.findUnique({
    where: { publicTicketSlug: slug },
  });

  if (!client || !client.publicTicketEnabled) {
    return null;
  }

  const expectedHash = sha256(token);
  if (expectedHash !== client.publicTicketTokenHash) {
    return null;
  }

  return client;
}

export async function assertPublicRateLimit(clientId: string) {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    "unknown";
  const userAgent = headerStore.get("user-agent") ?? "unknown";
  const windowStart = new Date(Date.now() - 10 * 60 * 1000);

  const recent = await prisma.publicTicketSubmissionLog.count({
    where: {
      clientId,
      ipAddress: ip,
      createdAt: { gte: windowStart },
    },
  });

  if (recent >= 8) {
    return { allowed: false as const };
  }

  await prisma.publicTicketSubmissionLog.create({
    data: {
      clientId,
      ipAddress: ip,
      userAgent,
    },
  });

  return { allowed: true as const };
}

export function hashPublicToken(token: string) {
  return sha256(token);
}
