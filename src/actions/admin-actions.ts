"use server";

import crypto from "node:crypto";
import path from "node:path";
import bcrypt from "bcryptjs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { CredentialType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { sendPasswordResetNotifications } from "@/lib/email-notifications";
import {
  generatePublicTicketToken,
  hashPublicToken,
} from "@/lib/public-ticket";
import { prisma } from "@/lib/prisma";
import { getDefaultPublicDocumentUploadsDir, getDocumentUploadsDir } from "@/lib/uploads-paths";

const createClientSchema = z.object({
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
});

export async function createClientAction(formData: FormData) {
  await requireAdmin();
  const parsed = createClientSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    throw new Error("Invalid client payload");
  }

  const token = generatePublicTicketToken();

  const client = await prisma.client.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      publicTicketSlug: parsed.data.slug,
      publicTicketTokenHash: hashPublicToken(token),
    },
  });

  await prisma.secureNote.create({
    data: {
      clientId: client.id,
      title: "Public ticket URL token",
      type: CredentialType.INTERNAL_NOTE,
      ...encryptSecret(token),
    },
  });

  revalidatePath("/admin");
}

export async function updateClientAction(formData: FormData) {
  await requireAdmin();
  const parsed = createClientSchema
    .extend({ id: z.string().min(1) })
    .safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      slug: formData.get("slug"),
    });

  if (!parsed.success) {
    throw new Error("Invalid client update payload");
  }

  await prisma.client.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      publicTicketSlug: parsed.data.slug,
    },
  });

  revalidatePath("/admin");
}

const createUserSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(10),
});

const updateClientUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email(),
  isActive: z.boolean(),
});

const rotatePublicTicketTokenSchema = z.object({
  clientId: z.string().min(1),
});

const resetClientPasswordSchema = z.object({
  clientId: z.string().min(1),
  userId: z.string().min(1),
  newPassword: z.string().min(10).max(128).optional(),
});

function pickChar(source: string) {
  return source[crypto.randomInt(0, source.length)];
}

function generateStrongPassword(length = 16) {
  const safeLength = Math.max(12, length);
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%*-_";
  const all = `${lower}${upper}${digits}${symbols}`;

  const chars = [
    pickChar(lower),
    pickChar(upper),
    pickChar(digits),
    pickChar(symbols),
  ];

  for (let i = chars.length; i < safeLength; i += 1) {
    chars.push(pickChar(all));
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  return chars.join("");
}

export async function createClientUserAction(formData: FormData) {
  await requireAdmin();
  const parsed = createUserSchema.safeParse({
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    throw new Error("Invalid user payload");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: Role.CLIENT,
      passwordHash,
      memberships: {
        create: {
          clientId: parsed.data.clientId,
        },
      },
    },
  });

  revalidatePath("/admin");
}

export async function rotateClientPublicTicketTokenAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = rotatePublicTicketTokenSchema.safeParse({
    clientId: formData.get("clientId"),
  });

  if (!parsed.success) {
    throw new Error("Invalid public token payload");
  }

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
    select: { id: true },
  });

  if (!client) {
    throw new Error("Client not found");
  }

  const token = generatePublicTicketToken();
  const tokenHash = hashPublicToken(token);
  const encrypted = encryptSecret(token);

  const existingTokenNote = await prisma.secureNote.findFirst({
    where: {
      clientId: parsed.data.clientId,
      title: "Public ticket URL token",
    },
    select: { id: true },
  });

  await prisma.client.update({
    where: { id: parsed.data.clientId },
    data: { publicTicketTokenHash: tokenHash },
  });

  if (existingTokenNote) {
    await prisma.secureNote.update({
      where: { id: existingTokenNote.id },
      data: {
        type: CredentialType.INTERNAL_NOTE,
        createdById: admin.id,
        ...encrypted,
      },
    });
  } else {
    await prisma.secureNote.create({
      data: {
        clientId: parsed.data.clientId,
        title: "Public ticket URL token",
        type: CredentialType.INTERNAL_NOTE,
        createdById: admin.id,
        ...encrypted,
      },
    });
  }

  revalidatePath("/admin");
}

export async function updateClientUserAction(formData: FormData) {
  await requireAdmin();
  const parsed = updateClientUserSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    email: formData.get("email"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    throw new Error("Invalid client user update payload");
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== Role.CLIENT) {
    throw new Error("Client user not found");
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      isActive: parsed.data.isActive,
    },
  });

  if (!parsed.data.isActive) {
    await prisma.session.deleteMany({
      where: { userId: parsed.data.userId },
    });
  }

  revalidatePath("/admin");
}

export async function resetClientUserPasswordAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = resetClientPasswordSchema.safeParse({
    clientId: formData.get("clientId"),
    userId: formData.get("userId"),
    newPassword: formData.get("newPassword") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid password reset payload");
  }

  const membership = await prisma.clientUser.findFirst({
    where: {
      clientId: parsed.data.clientId,
      userId: parsed.data.userId,
      user: {
        role: Role.CLIENT,
        isActive: true,
      },
    },
    select: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      client: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!membership) {
    throw new Error("Client user not found for this account");
  }

  const temporaryPassword = parsed.data.newPassword?.trim() || generateStrongPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  await prisma.user.update({
    where: { id: membership.user.id },
    data: { passwordHash },
  });

  await prisma.session.deleteMany({
    where: { userId: membership.user.id },
  });

  try {
    await sendPasswordResetNotifications({
      adminEmail: admin.email,
      clientName: membership.client.name,
      userName: membership.user.name,
      userEmail: membership.user.email,
      temporaryPassword,
    });
  } catch (error) {
    console.error("[password-reset] notification error", error);
  }

  revalidatePath("/admin");
}

const createServiceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

const updateServiceSchema = z.object({
  serviceId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  isActive: z.boolean(),
});

export async function createServiceCatalogAction(formData: FormData) {
  await requireAdmin();
  const parsed = createServiceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    throw new Error("Invalid service payload");
  }

  await prisma.serviceCatalog.create({
    data: parsed.data,
  });
  revalidatePath("/admin");
}

export async function updateServiceCatalogAction(formData: FormData) {
  await requireAdmin();
  const parsed = updateServiceSchema.safeParse({
    serviceId: formData.get("serviceId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    throw new Error("Invalid service update payload");
  }

  await prisma.serviceCatalog.update({
    where: { id: parsed.data.serviceId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      isActive: parsed.data.isActive,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/activities");
  revalidatePath("/dashboard");
}

const assignServiceSchema = z.object({
  clientId: z.string().min(1),
  serviceId: z.string().min(1),
  notes: z.string().optional(),
});

export async function assignServiceToClientAction(formData: FormData) {
  await requireAdmin();
  const parsed = assignServiceSchema.safeParse({
    clientId: formData.get("clientId"),
    serviceId: formData.get("serviceId"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    throw new Error("Invalid assignment payload");
  }

  await prisma.clientService.upsert({
    where: {
      clientId_serviceId: {
        clientId: parsed.data.clientId,
        serviceId: parsed.data.serviceId,
      },
    },
    create: parsed.data,
    update: {
      notes: parsed.data.notes,
      isActive: true,
    },
  });
  revalidatePath("/admin");
}

const createDocumentSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(2),
  filename: z.string().optional(),
  mimeType: z.string().optional(),
  storagePath: z.string().optional(),
});

export async function createDocumentAction(formData: FormData) {
  await requireAdmin();
  const parsed = createDocumentSchema.safeParse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    filename: formData.get("filename") || undefined,
    mimeType: formData.get("mimeType") || undefined,
    storagePath: formData.get("storagePath") || undefined,
  });
  if (!parsed.success) {
    throw new Error("Invalid document payload");
  }

  const fileEntry = formData.get("documentFile");
  const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;

  let filename = parsed.data.filename?.trim() || "";
  let storagePath = parsed.data.storagePath?.trim() || "";
  let mimeType = parsed.data.mimeType?.trim() || "";
  let sizeBytes: number | undefined;
  let fileBytes: Buffer | undefined;

  if (file) {
    const fileExt = path.extname(file.name);
    const generatedName = `${Date.now()}-${crypto.randomUUID()}${fileExt}`;
    const uploadDir = getDocumentUploadsDir();
    await mkdir(uploadDir, { recursive: true });
    const absolutePath = path.join(uploadDir, generatedName);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absolutePath, fileBuffer);

    filename = file.name;
    storagePath = `/uploads/documents/${generatedName}`;
    mimeType = file.type || mimeType || "application/octet-stream";
    sizeBytes = file.size;
    fileBytes = fileBuffer;
  } else {
    if (!filename || !storagePath) {
      throw new Error("Provide a file upload or storage URL + filename");
    }
  }

  await prisma.document.create({
    data: {
      clientId: parsed.data.clientId,
      title: parsed.data.title,
      filename,
      mimeType: mimeType || null,
      storagePath,
      sizeBytes,
      fileBytes: fileBytes ?? null,
    },
  });
  revalidatePath("/documents");
  revalidatePath("/dashboard");
}

const deleteDocumentSchema = z.object({
  documentId: z.string().min(1),
});

export async function deleteDocumentAction(formData: FormData) {
  await requireAdmin();
  const parsed = deleteDocumentSchema.safeParse({
    documentId: formData.get("documentId"),
  });
  if (!parsed.success) {
    throw new Error("Invalid document delete payload");
  }

  const document = await prisma.document.findUnique({
    where: { id: parsed.data.documentId },
    select: { id: true, storagePath: true },
  });

  if (!document) {
    throw new Error("Document not found");
  }

  if (document.storagePath.startsWith("/uploads/documents/")) {
    const fileName = path.basename(document.storagePath);
    const candidatePaths = [
      path.join(getDocumentUploadsDir(), fileName),
      path.join(getDefaultPublicDocumentUploadsDir(), fileName),
    ];

    for (const filePath of candidatePaths) {
      await unlink(filePath).catch(() => {});
    }
  } else if (path.isAbsolute(document.storagePath)) {
    await unlink(document.storagePath).catch(() => {});
  }

  await prisma.document.delete({
    where: { id: document.id },
  });
  revalidatePath("/documents");
  revalidatePath("/dashboard");
}

const secureNoteSchema = z.object({
  clientId: z.string().min(1),
  type: z.nativeEnum(CredentialType),
  title: z.string().min(2),
  plainText: z.string().min(2),
});

export async function createSecureNoteAction(formData: FormData) {
  const user = await requireAdmin();
  const parsed = secureNoteSchema.safeParse({
    clientId: formData.get("clientId"),
    type: formData.get("type"),
    title: formData.get("title"),
    plainText: formData.get("plainText"),
  });
  if (!parsed.success) {
    throw new Error("Invalid secure note payload");
  }

  await prisma.secureNote.create({
    data: {
      clientId: parsed.data.clientId,
      type: parsed.data.type,
      title: parsed.data.title,
      createdById: user.id,
      ...encryptSecret(parsed.data.plainText),
    },
  });
  revalidatePath("/admin");
}


