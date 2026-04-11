"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  iconWhenHasComments?: boolean;
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
  iconWhenHasComments = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [wasSeen, setWasSeen] = useState(false);
  const markSeenFormRef = useRef<HTMLFormElement>(null);
  const hasUnread = hasUnreadClientComment && !wasSeen;
  const shouldUseCommentIcon = iconWhenHasComments && comments.length > 0;
  const buttonBaseClass = hasUnread ? "border-amber-300 bg-amber-50 text-amber-800" : "border-zinc-300 bg-white text-zinc-700";
  const modalRoot = typeof document !== "undefined" ? document.body : null;

  if (iconWhenHasComments && comments.length === 0) {
    return null;
  }

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
        title={`Comentarios (${comments.length})`}
        aria-label={`Comentarios (${comments.length})`}
        className={`inline-flex items-center rounded-md border text-xs hover:bg-zinc-100 ${
          shouldUseCommentIcon ? `h-8 w-8 justify-center p-0 ${buttonBaseClass}` : `gap-1 px-2 py-1 ${buttonBaseClass}`
        }`}
      >
        {shouldUseCommentIcon ? (
          <>
            <svg viewBox="0 0 640 640" className="h-4 w-4" aria-hidden="true">
              <path
                d="M320 544C461.4 544 576 436.5 576 304C576 171.5 461.4 64 320 64C178.6 64 64 171.5 64 304C64 358.3 83.2 408.3 115.6 448.5L66.8 540.8C62 549.8 63.5 560.8 70.4 568.3C77.3 575.8 88.2 578.1 97.5 574.1L215.9 523.4C247.7 536.6 282.9 544 320 544zM192 272C209.7 272 224 286.3 224 304C224 321.7 209.7 336 192 336C174.3 336 160 321.7 160 304C160 286.3 174.3 272 192 272zM320 272C337.7 272 352 286.3 352 304C352 321.7 337.7 336 320 336C302.3 336 288 321.7 288 304C288 286.3 302.3 272 320 272zM416 304C416 286.3 430.3 272 448 272C465.7 272 480 286.3 480 304C480 321.7 465.7 336 448 336C430.3 336 416 321.7 416 304z"
                fill="currentColor"
              />
            </svg>
            <span className="sr-only">Comentarios ({comments.length})</span>
          </>
        ) : (
          <>
            Comentarios ({comments.length})
            {hasUnread ? <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">Nuevo</span> : null}
          </>
        )}
      </button>

      {isOpen && modalRoot
        ? createPortal(
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
          ,
          modalRoot,
        )
        : null}
    </>
  );
}
