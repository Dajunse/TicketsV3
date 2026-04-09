import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeEnvValue(value) {
  if (typeof value !== "string") return null;
  let normalized = value.trim();
  if (!normalized) return null;

  const startsWithQuote = normalized.startsWith('"') || normalized.startsWith("'");
  const endsWithQuote = normalized.endsWith('"') || normalized.endsWith("'");
  if (startsWithQuote && endsWithQuote && normalized.length >= 2) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized || null;
}

function isTruthyFlag(value) {
  const normalized = normalizeEnvValue(value);
  if (!normalized) return false;
  return ["1", "true", "yes", "on"].includes(normalized.toLowerCase());
}

async function main() {
  const email =
    (normalizeEnvValue(process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.ADMIN_EMAIL) || "admin@tianmake.studio").toLowerCase();
  const name = normalizeEnvValue(process.env.BOOTSTRAP_ADMIN_NAME) || "Administrador";

  const providedPasswordRaw = process.env.BOOTSTRAP_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  const providedPassword = normalizeEnvValue(providedPasswordRaw);
  const forceReset = isTruthyFlag(process.env.BOOTSTRAP_ADMIN_FORCE_RESET);

  if (providedPasswordRaw && !providedPassword) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD/ADMIN_PASSWORD is empty after trimming. Remove extra spaces or quotes in Railway variables.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  const shouldWritePassword = Boolean(providedPassword) || !existing || forceReset;
  const password = shouldWritePassword ? providedPassword || "Admin12345!" : null;

  const updateData = {
    name,
    role: Role.ADMIN,
    isActive: true,
  };

  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 12);
  }

  await prisma.user.upsert({
    where: { email },
    update: updateData,
    create: {
      email,
      name,
      role: Role.ADMIN,
      isActive: true,
      passwordHash: await bcrypt.hash(password || "Admin12345!", 12),
    },
  });

  console.log(`[bootstrap-admin] Admin ready: ${email}`);
  if (providedPassword && providedPasswordRaw && providedPassword !== providedPasswordRaw) {
    console.log("[bootstrap-admin] Admin password variable was normalized (trimmed quotes/spaces).");
  }
  if (!providedPassword && !existing) {
    console.log("[bootstrap-admin] Default password used: Admin12345! (change it immediately).");
  }
  if (forceReset && !providedPassword) {
    console.log("[bootstrap-admin] BOOTSTRAP_ADMIN_FORCE_RESET enabled: password reset to default Admin12345!.");
  }
  if (!providedPassword && existing && !forceReset) {
    console.log("[bootstrap-admin] Existing admin password kept. Set BOOTSTRAP_ADMIN_PASSWORD to rotate it.");
  }
}

main()
  .catch((error) => {
    console.error("[bootstrap-admin] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
