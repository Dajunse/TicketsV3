"use client";

import { useRef, useTransition } from "react";
import { updateActivityMaterialApprovalAction } from "@/actions/activity-actions";

type ActivityMaterialCheckboxProps = {
  materialId: string;
  checked: boolean;
  showStatusLabel?: boolean;
};

export function ActivityMaterialCheckbox({ materialId, checked, showStatusLabel = true }: ActivityMaterialCheckboxProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending] = useTransition();
  const statusLabel = isPending ? "Guardando..." : checked ? "Aprobado" : "Pendiente";

  return (
    <form ref={formRef} action={updateActivityMaterialApprovalAction}>
      <input type="hidden" name="materialId" value={materialId} />
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="approved"
          defaultChecked={checked}
          disabled={isPending}
          onChange={() => formRef.current?.requestSubmit()}
          className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
        />
        {showStatusLabel ? statusLabel : <span className="sr-only">{statusLabel}</span>}
      </label>
    </form>
  );
}
