import path from "path";
import { access, readFile } from "fs/promises";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const INLINE_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

function buildCandidatePaths(fileStoragePath: string | null, filePublicUrl: string | null) {
  const candidates: string[] = [];

  if (fileStoragePath) {
    candidates.push(fileStoragePath);
  }

  if (filePublicUrl?.startsWith("/uploads/materials/")) {
    const relativePath = filePublicUrl.replace(/^\/+/, "");
    if (!relativePath.includes("..")) {
      candidates.push(path.join(process.cwd(), "public", relativePath));
    }
  }

  return candidates;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ materialId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.redirect(new URL("/login", request.url), 302);
  }

  const { materialId } = await params;
  if (!materialId) {
    return new Response("Material not found", { status: 404 });
  }

  const material = await prisma.activityMaterial.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      fileStoragePath: true,
      filePublicUrl: true,
      fileName: true,
      fileMimeType: true,
      activity: {
        select: {
          clientId: true,
        },
      },
    },
  });

  if (!material || !material.filePublicUrl) {
    return new Response("Material not found", { status: 404 });
  }

  const hasAccess =
    user.role === Role.ADMIN || user.memberships.some((membership) => membership.clientId === material.activity.clientId);

  if (!hasAccess) {
    return new Response("Material not found", { status: 404 });
  }

  const candidatePaths = buildCandidatePaths(material.fileStoragePath, material.filePublicUrl);
  let fileBuffer: Buffer | null = null;

  for (const filePath of candidatePaths) {
    try {
      await access(filePath);
      fileBuffer = await readFile(filePath);
      break;
    } catch {
      // Continue to next candidate path.
    }
  }

  if (!fileBuffer) {
    return new Response("Material file unavailable", { status: 404 });
  }

  const mimeType = material.fileMimeType || "application/octet-stream";
  const fallbackName = "material";
  const safeName = (material.fileName || fallbackName).replace(/["\r\n]/g, "");
  const disposition = INLINE_MIME_TYPES.has(mimeType)
    ? `inline; filename="${safeName}"`
    : `attachment; filename="${safeName}"`;

  const responseBody = new Uint8Array(fileBuffer);

  return new Response(responseBody, {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(responseBody.byteLength),
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
