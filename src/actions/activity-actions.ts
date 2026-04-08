"use server";

import crypto from "crypto";
import path from "path";
import { mkdir, unlink, writeFile } from "fs/promises";
import { ActivityStatus, Priority, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const activitySchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(3),
  description: z.string().optional(),
  dueDate: z.string().min(1),
  status: z.nativeEnum(ActivityStatus),
  priority: z.nativeEnum(Priority),
  clientServiceId: z.string().optional(),
});

const updateActivitySchema = z.object({
  activityId: z.string().min(1),
  title: z.string().min(3),
  description: z.string().optional(),
  dueDate: z.string().min(1),
  priority: z.nativeEnum(Priority),
  clientServiceId: z.string().optional(),
});

const publicationProposalSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(3),
  description: z.string().optional(),
  reviewUrl: z.string().url(),
  scheduledFor: z.string().optional(),
});

const activityMaterialSchema = z.object({
  activityId: z.string().min(1),
  name: z.string().min(2),
  materialUrl: z.string().url().optional(),
});

const ALLOWED_MATERIAL_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const MAX_MATERIAL_FILE_SIZE = 8 * 1024 * 1024;

function inferExtension(fileName: string, mimeType: string) {
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg") return ".jpg";

  const fromName = path.extname(fileName).toLowerCase();
  return fromName || ".bin";
}

function parseDateInputToUtcNoon(dateInput: string) {
  const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("Invalid date format");
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));
}

export async function createActivityAction(formData: FormData) {
  const user = await requireUser();
  const parsed = activitySchema.safeParse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    dueDate: formData.get("dueDate"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    clientServiceId: formData.get("clientServiceId") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid activity payload");
  }

  if (user.role !== Role.ADMIN) {
    throw new Error("Only admins can create activities");
  }

  await prisma.activity.create({
    data: {
      clientId: parsed.data.clientId,
      title: parsed.data.title,
      description: parsed.data.description,
      dueDate: parseDateInputToUtcNoon(parsed.data.dueDate),
      status: parsed.data.status,
      priority: parsed.data.priority,
      clientServiceId: parsed.data.clientServiceId || null,
    },
  });

  revalidatePath("/activities");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function createPublicationProposalAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) {
    throw new Error("Only admins can create publication proposals");
  }

  const parsed = publicationProposalSchema.safeParse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    reviewUrl: formData.get("reviewUrl"),
    scheduledFor: formData.get("scheduledFor") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid publication proposal payload");
  }

  await prisma.publicationProposal.create({
    data: {
      clientId: parsed.data.clientId,
      createdById: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      reviewUrl: parsed.data.reviewUrl,
      scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null,
    },
  });

  revalidatePath("/activities");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function updatePublicationProposalApprovalAction(formData: FormData) {
  const user = await requireUser();
  const proposalId = String(formData.get("proposalId") ?? "");
  const approved = formData.get("approved") === "on";

  if (!proposalId) {
    throw new Error("Invalid publication proposal update");
  }

  const proposal = await prisma.publicationProposal.findUnique({
    where: { id: proposalId },
    select: { id: true, clientId: true },
  });

  if (!proposal) {
    throw new Error("Publication proposal not found");
  }

  const hasAccess =
    user.role === Role.ADMIN || user.memberships.some((membership) => membership.clientId === proposal.clientId);
  if (!hasAccess) {
    throw new Error("Unauthorized tenant access");
  }

  await prisma.publicationProposal.update({
    where: { id: proposalId },
    data: {
      isApproved: approved,
      approvedAt: approved ? new Date() : null,
      approvedById: approved ? user.id : null,
    },
  });

  revalidatePath("/activities");
  revalidatePath("/dashboard");
}

export async function updateActivityStatusAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("activityId") ?? "");
  const nextStatus = String(formData.get("status") ?? "");

  if (!id || !Object.values(ActivityStatus).includes(nextStatus as ActivityStatus)) {
    throw new Error("Invalid status update");
  }

  if (user.role !== Role.ADMIN) {
    throw new Error("Only admins can update activities");
  }

  await prisma.activity.update({
    where: { id },
    data: { status: nextStatus as ActivityStatus },
  });

  revalidatePath("/activities");
  revalidatePath("/dashboard");
}

export async function updateActivityDetailsAction(formData: FormData) {
  const user = await requireUser();

  if (user.role !== Role.ADMIN) {
    throw new Error("Only admins can edit activities");
  }

  const parsed = updateActivitySchema.safeParse({
    activityId: formData.get("activityId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    dueDate: formData.get("dueDate"),
    priority: formData.get("priority"),
    clientServiceId: formData.get("clientServiceId") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid activity update payload");
  }

  const activity = await prisma.activity.findUnique({
    where: { id: parsed.data.activityId },
    select: { id: true, clientId: true },
  });

  if (!activity) {
    throw new Error("Activity not found");
  }

  if (parsed.data.clientServiceId) {
    const service = await prisma.clientService.findUnique({
      where: { id: parsed.data.clientServiceId },
      select: { id: true, clientId: true },
    });

    if (!service || service.clientId !== activity.clientId) {
      throw new Error("Invalid client service for this activity");
    }
  }

  await prisma.activity.update({
    where: { id: parsed.data.activityId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      dueDate: parseDateInputToUtcNoon(parsed.data.dueDate),
      priority: parsed.data.priority,
      clientServiceId: parsed.data.clientServiceId || null,
    },
  });

  revalidatePath("/activities");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function deleteActivityAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) {
    throw new Error("Only admins can delete activities");
  }

  const activityId = String(formData.get("activityId") ?? "");
  if (!activityId) {
    throw new Error("Invalid activity id");
  }

  const materials = await prisma.activityMaterial.findMany({
    where: { activityId },
    select: { fileStoragePath: true },
  });

  for (const material of materials) {
    if (material.fileStoragePath) {
      await unlink(material.fileStoragePath).catch(() => {});
    }
  }

  await prisma.activity.delete({
    where: { id: activityId },
  });

  revalidatePath("/activities");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function createActivityMaterialAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) {
    throw new Error("Only admins can add activity materials");
  }

  const parsed = activityMaterialSchema.safeParse({
    activityId: formData.get("activityId"),
    name: formData.get("name"),
    materialUrl: formData.get("materialUrl") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid activity material payload");
  }

  const fileEntry = formData.get("materialFile");
  const file =
    fileEntry instanceof File && fileEntry.size > 0
      ? fileEntry
      : null;

  if (file) {
    if (!ALLOWED_MATERIAL_MIME_TYPES.has(file.type)) {
      throw new Error("Only PDF, PNG or JPG files are allowed");
    }

    if (file.size > MAX_MATERIAL_FILE_SIZE) {
      throw new Error("File exceeds max size of 8MB");
    }
  }

  const activity = await prisma.activity.findUnique({
    where: { id: parsed.data.activityId },
    select: { id: true },
  });

  if (!activity) {
    throw new Error("Activity not found");
  }

  let fileStoragePath: string | null = null;
  let filePublicUrl: string | null = null;
  let fileName: string | null = null;
  let fileMimeType: string | null = null;
  let fileSizeBytes: number | null = null;

  if (file) {
    const extension = inferExtension(file.name, file.type);
    const generatedName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "materials");
    await mkdir(uploadDir, { recursive: true });

    const absolutePath = path.join(uploadDir, generatedName);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absolutePath, fileBuffer);

    fileStoragePath = absolutePath;
    filePublicUrl = `/uploads/materials/${generatedName}`;
    fileName = file.name;
    fileMimeType = file.type;
    fileSizeBytes = file.size;
  }

  await prisma.activityMaterial.create({
    data: {
      activityId: parsed.data.activityId,
      name: parsed.data.name,
      materialUrl: parsed.data.materialUrl ?? null,
      fileStoragePath,
      filePublicUrl,
      fileName,
      fileMimeType,
      fileSizeBytes,
    },
  });

  revalidatePath("/activities");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function updateActivityMaterialApprovalAction(formData: FormData) {
  const user = await requireUser();
  const materialId = String(formData.get("materialId") ?? "");
  const approved = formData.get("approved") === "on";

  if (!materialId) {
    throw new Error("Invalid activity material update");
  }

  const material = await prisma.activityMaterial.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      activity: {
        select: { clientId: true },
      },
    },
  });

  if (!material) {
    throw new Error("Activity material not found");
  }

  const hasAccess =
    user.role === Role.ADMIN || user.memberships.some((membership) => membership.clientId === material.activity.clientId);

  if (!hasAccess) {
    throw new Error("Unauthorized tenant access");
  }

  await prisma.activityMaterial.update({
    where: { id: materialId },
    data: {
      isApproved: approved,
      approvedAt: approved ? new Date() : null,
      approvedById: approved ? user.id : null,
    },
  });

  revalidatePath("/activities");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function deleteActivityMaterialAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) {
    throw new Error("Only admins can delete materials");
  }

  const materialId = String(formData.get("materialId") ?? "");
  if (!materialId) {
    throw new Error("Invalid material id");
  }

  const material = await prisma.activityMaterial.findUnique({
    where: { id: materialId },
    select: { id: true, fileStoragePath: true },
  });

  if (!material) {
    throw new Error("Material not found");
  }

  if (material.fileStoragePath) {
    await unlink(material.fileStoragePath).catch(() => {});
  }

  await prisma.activityMaterial.delete({
    where: { id: materialId },
  });

  revalidatePath("/activities");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}
