import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@tianmake.studio").toLowerCase();
  const name = process.env.BOOTSTRAP_ADMIN_NAME || "Administrador";
  const providedPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  const existing = await prisma.user.findUnique({ where: { email } });
  const password = providedPassword || (!existing ? "Admin12345!" : null);

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
  if (!providedPassword && !existing) {
    console.log("[bootstrap-admin] Default password used: Admin12345! (change it immediately).");
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
