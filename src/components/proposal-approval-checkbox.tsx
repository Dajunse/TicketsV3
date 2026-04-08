"use client";

import { useRef, useTransition } from "react";
import { updatePublicationProposalApprovalAction } from "@/actions/activity-actions";

type ProposalApprovalCheckboxProps = {
  proposalId: string;
  checked: boolean;
};

export function ProposalApprovalCheckbox({ proposalId, checked }: ProposalApprovalCheckboxProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending] = useTransition();

  return (
    <form ref={formRef} action={updatePublicationProposalApprovalAction}>
      <input type="hidden" name="proposalId" value={proposalId} />
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="approved"
          defaultChecked={checked}
          disabled={isPending}
          onChange={() => formRef.current?.requestSubmit()}
          className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
        />
        {isPending ? "Guardando..." : "Aprobado"}
      </label>
    </form>
  );
}
