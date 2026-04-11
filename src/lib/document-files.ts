type DocumentFileRef = {
  id: string;
  storagePath: string;
};

export function getDocumentFileHref(document: DocumentFileRef): string {
  if (document.storagePath.startsWith("/uploads/documents/")) {
    return `/document-files/${document.id}`;
  }

  return document.storagePath;
}
