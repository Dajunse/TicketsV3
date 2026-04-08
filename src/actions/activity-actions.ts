"use server";

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
      dueDate: new Date(parsed.data.dueDate),
      status: parsed.data.status,
      priority: parsed.data.priority,
      clientServiceId: parsed.data.clientServiceId || null,
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
