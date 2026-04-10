"use client";

import { useRef, useState } from "react";
import { addActivityMaterialCommentAction, markActivityMaterialCommentsSeenAction } from "@/actions/activity-actions";

type MaterialCommentItem = {
  id: string;
  body: string;
  createdAt: string | Date;
  authorName: string;
  authorRole: "ADMIN" | "CLIENT";
};

type Props = {
  materialId: string;
  materialName: string;
  isAdmin: boolean;
  hasUnreadClientComment: boolean;
  comments: MaterialCommentItem[];
};

function formatCommentDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ActivityMaterialCommentsModal({
  materialId,
  materialName,
  isAdmin,
  hasUnreadClientComment,
  comments,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [wasSeen, setWasSeen] = useState(false);
  const markSeenFormRef = useRef<HTMLFormElement>(null);
  const hasUnread = hasUnreadClientComment && !wasSeen;

  return (
    <>
      <form ref={markSeenFormRef} action={markActivityMaterialCommentsSeenAction} className="hidden">
        <input type="hidden" name="materialId" value={materialId} />
      </form>

      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          if (isAdmin && hasUnread) {
            markSeenFormRef.current?.requestSubmit();
            setWasSeen(true);
          }
        }}
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
          hasUnread ? "border-amber-300 bg-amber-50 text-amber-800" : "border-zinc-300 bg-white text-zinc-700"
        } hover:bg-zinc-100`}
      >
        Comentarios ({comments.length})
        {hasUnread ? <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">Nuevo</span> : null}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="border-b border-zinc-200 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-zinc-900">Comentarios - {materialName}</h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="max-h-[48vh] space-y-2 overflow-y-auto px-4 py-3">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
                    <p className="text-sm text-zinc-800">{comment.body}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {comment.authorName} - {comment.authorRole === "ADMIN" ? "Admin" : "Cliente"} - {formatCommentDate(comment.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">Aun no hay comentarios en este material.</p>
              )}
            </div>

            <div className="border-t border-zinc-200 px-4 py-3">
              <form action={addActivityMaterialCommentAction} className="space-y-2">
                <input type="hidden" name="materialId" value={materialId} />
                <textarea
                  name="body"
                  required
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Escribe tu comentario..."
                />
                <div className="flex justify-end">
                  <button type="submit" className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800">
                    Agregar comentario
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
