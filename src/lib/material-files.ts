type MaterialFileRef = {
  id: string;
  filePublicUrl: string | null;
};

export function getMaterialFileHref(material: MaterialFileRef): string | null {
  if (!material.filePublicUrl) {
    return null;
  }

  if (material.filePublicUrl.startsWith("/uploads/materials/")) {
    return `/material-files/${material.id}`;
  }

  return material.filePublicUrl;
}
