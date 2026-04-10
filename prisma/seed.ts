import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin12345!", 12);
  const clientPasswordHash = await bcrypt.hash("Cliente12345!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@tianmake.studio" },
    update: {
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      email: "admin@tianmake.studio",
      name: "Administrador",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const blairToken = "blair-support-link-2026";
  const newellToken = "newell-support-link-2026";

  const blair = await prisma.client.upsert({
    where: { slug: "blair" },
    update: {
      name: "Blair",
      publicTicketSlug: "blair",
      publicTicketTokenHash: sha256(blairToken),
      publicTicketEnabled: true,
    },
    create: {
      name: "Blair",
      slug: "blair",
      publicTicketSlug: "blair",
      publicTicketTokenHash: sha256(blairToken),
      publicTicketEnabled: true,
    },
  });

  const newell = await prisma.client.upsert({
    where: { slug: "newell" },
    update: {
      name: "Newell",
      publicTicketSlug: "newell",
      publicTicketTokenHash: sha256(newellToken),
      publicTicketEnabled: true,
    },
    create: {
      name: "Newell",
      slug: "newell",
      publicTicketSlug: "newell",
      publicTicketTokenHash: sha256(newellToken),
      publicTicketEnabled: true,
    },
  });

  const services = [
    "hosting",
    "correo electrónico",
    "marketing",
    "redes sociales",
    "soporte técnico",
  ];
  for (const serviceName of services) {
    await prisma.serviceCatalog.upsert({
      where: { name: serviceName },
      update: {},
      create: { name: serviceName },
    });
  }

  const marketing = await prisma.serviceCatalog.findUniqueOrThrow({
    where: { name: "marketing" },
  });
  const social = await prisma.serviceCatalog.findUniqueOrThrow({
    where: { name: "redes sociales" },
  });
  const hosting = await prisma.serviceCatalog.findUniqueOrThrow({
    where: { name: "hosting" },
  });
  const emailService = await prisma.serviceCatalog.findUniqueOrThrow({
    where: { name: "correo electrónico" },
  });

  await prisma.clientService.upsert({
    where: {
      clientId_serviceId: { clientId: blair.id, serviceId: marketing.id },
    },
    update: { notes: "Campañas y seguimiento mensual." },
    create: {
      clientId: blair.id,
      serviceId: marketing.id,
      notes: "Campañas y seguimiento mensual.",
    },
  });

  await prisma.clientService.upsert({
    where: { clientId_serviceId: { clientId: blair.id, serviceId: social.id } },
    update: { notes: "Planeación de contenido semanal." },
    create: {
      clientId: blair.id,
      serviceId: social.id,
      notes: "Planeación de contenido semanal.",
    },
  });

  await prisma.clientService.upsert({
    where: {
      clientId_serviceId: { clientId: newell.id, serviceId: hosting.id },
    },
    update: { notes: "Monitoreo y mantenimiento de infraestructura." },
    create: {
      clientId: newell.id,
      serviceId: hosting.id,
      notes: "Monitoreo y mantenimiento de infraestructura.",
    },
  });

  await prisma.clientService.upsert({
    where: {
      clientId_serviceId: { clientId: newell.id, serviceId: emailService.id },
    },
    update: { notes: "Administración de cuentas corporativas." },
    create: {
      clientId: newell.id,
      serviceId: emailService.id,
      notes: "Administración de cuentas corporativas.",
    },
  });

  const blairUser = await prisma.user.upsert({
    where: { email: "equipo@blair.com" },
    update: { passwordHash: clientPasswordHash, role: Role.CLIENT },
    create: {
      email: "equipo@blair.com",
      name: "Equipo Blair",
      role: Role.CLIENT,
      passwordHash: clientPasswordHash,
    },
  });

  const newellUser = await prisma.user.upsert({
    where: { email: "soporte@newell.com" },
    update: { passwordHash: clientPasswordHash, role: Role.CLIENT },
    create: {
      email: "soporte@newell.com",
      name: "Soporte Newell",
      role: Role.CLIENT,
      passwordHash: clientPasswordHash,
    },
  });

  await prisma.clientUser.upsert({
    where: { clientId_userId: { clientId: blair.id, userId: blairUser.id } },
    update: {},
    create: { clientId: blair.id, userId: blairUser.id },
  });

  await prisma.clientUser.upsert({
    where: { clientId_userId: { clientId: newell.id, userId: newellUser.id } },
    update: {},
    create: { clientId: newell.id, userId: newellUser.id },
  });

  await prisma.activity.createMany({
    data: [
      {
        clientId: blair.id,
        title: "Planeación de calendario editorial",
        description: "Definir publicaciones del mes y fechas clave.",
        dueDate: new Date("2026-04-10"),
        status: "IN_PROGRESS",
        priority: "HIGH",
      },
      {
        clientId: newell.id,
        title: "Revisión de respaldos del hosting",
        description: "Validar integridad y restauración de backup.",
        dueDate: new Date("2026-04-08"),
        status: "PENDING",
        priority: "MEDIUM",
      },
    ],
    skipDuplicates: true,
  });

  const editorialActivity = await prisma.activity.findFirst({
    where: { clientId: blair.id, title: "PlaneaciÃ³n de calendario editorial" },
    orderBy: { createdAt: "asc" },
  });

  if (editorialActivity) {
    await prisma.activityMaterial.deleteMany({
      where: { activityId: editorialActivity.id },
    });

    await prisma.activityMaterial.createMany({
      data: [
        {
          activityId: editorialActivity.id,
          name: "Manzana",
          materialUrl: null,
        },
        {
          activityId: editorialActivity.id,
          name: "Pera",
          materialUrl: "https://example.com/revision/blair/video-pera",
        },
      ],
    });
  }

  await prisma.publicationProposal.createMany({
    data: [
      {
        clientId: blair.id,
        createdById: admin.id,
        title: "Lista de frutas para publicar",
        description: "Carrusel con frutas de temporada para redes sociales.",
        reviewUrl: "https://example.com/revision/blair/frutas-abril",
        scheduledFor: new Date("2026-04-12"),
        isApproved: false,
      },
      {
        clientId: blair.id,
        createdById: admin.id,
        title: "Lista de vacantes para publicar",
        description: "Publicacion semanal de vacantes activas.",
        reviewUrl: "https://example.com/revision/blair/vacantes-semana-2",
        scheduledFor: new Date("2026-04-15"),
        isApproved: true,
        approvedAt: new Date("2026-04-08T10:00:00.000Z"),
        approvedById: blairUser.id,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.document.createMany({
    data: [
      {
        clientId: blair.id,
        title: "Reporte mensual de marketing",
        filename: "reporte-marketing-marzo.pdf",
        mimeType: "application/pdf",
        storagePath:
          "https://example.com/docs/blair/reporte-marketing-marzo.pdf",
      },
      {
        clientId: newell.id,
        title: "Manual de correo corporativo",
        filename: "manual-correo.pdf",
        mimeType: "application/pdf",
        storagePath: "https://example.com/docs/newell/manual-correo.pdf",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.ticket.create({
    data: {
      clientId: blair.id,
      createdById: blairUser.id,
      subject: "Ajustar pauta de campaña",
      description:
        "Necesitamos mover presupuesto a una campaña de remarketing.",
      category: "marketing",
      priority: "MEDIUM",
      status: "OPEN",
      origin: "AUTHENTICATED",
    },
  });

  // console.log("Seed completado");
  // console.log("Admin:", admin.email, "password: Admin12345!");
  // console.log("Cliente Blair:", blairUser.email, "password: Cliente12345!");
  // console.log("Cliente Newell:", newellUser.email, "password: Cliente12345!");
  // console.log("Public Blair URL: /support/blair/" + blairToken);
  // console.log("Public Newell URL: /support/newell/" + newellToken);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
