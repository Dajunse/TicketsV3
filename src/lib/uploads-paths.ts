import path from "path";

function normalizeConfiguredUploadsDir(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return path.resolve(trimmed);
}

export function getUploadsRootDir() {
  return normalizeConfiguredUploadsDir(process.env.UPLOADS_DIR) ?? path.join(process.cwd(), "public", "uploads");
}

export function getMaterialUploadsDir() {
  return path.join(getUploadsRootDir(), "materials");
}

export function getDefaultPublicMaterialUploadsDir() {
  return path.join(process.cwd(), "public", "uploads", "materials");
}
