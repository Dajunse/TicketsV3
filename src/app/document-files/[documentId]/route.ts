import path from "path";
import { access, readFile } from "fs/promises";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDefaultPublicDocumentUploadsDir, getDocumentUploadsDir } from "@/lib/uploads-paths";

export const runtime = "nodejs";

const INLINE_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);

function buildCandidatePaths(storagePath: string) {
  const candidates = new Set<string>();

  if (path.isAbsolute(storagePath)) {
    candidates.add(storagePath);
    return Array.from(candidates);
  }

  if (storagePath.startsWith("/uploads/documents/")) {
    const fileName = path.basename(storagePath);
    if (fileName && fileName !== "." && fileName !== "/") {
      candidates.add(path.join(getDocumentUploadsDir(), fileName));
      candidates.add(path.join(getDefaultPublicDocumentUploadsDir(), fileName));
    }
  }

  return Array.from(candidates);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.redirect(new URL("/login", request.url), 302);
  }

  const { documentId } = await params;
  if (!documentId) {
    return new Response("Document not found", { status: 404 });
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      storagePath: true,
      clientId: true,
    },
  });

  if (!document) {
    return new Response("Document not found", { status: 404 });
  }

  const hasAccess =
    user.role === Role.ADMIN || user.memberships.some((membership) => membership.clientId === document.clientId);

  if (!hasAccess) {
    return new Response("Document not found", { status: 404 });
  }

  if (!document.storagePath.startsWith("/uploads/documents/") && !path.isAbsolute(document.storagePath)) {
    return Response.redirect(document.storagePath, 302);
  }

  const candidatePaths = buildCandidatePaths(document.storagePath);
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
    return new Response("Document file unavailable", { status: 404 });
  }

  const mimeType = document.mimeType || "application/octet-stream";
  const safeName = (document.filename || "documento").replace(/["\r\n]/g, "");
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
