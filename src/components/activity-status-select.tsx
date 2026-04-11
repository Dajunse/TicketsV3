"use client";

import { ActivityStatus } from "@prisma/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateActivityStatusAction } from "@/actions/activity-actions";
import { activityStatusLabel } from "@/lib/labels";

type ActivityStatusSelectProps = {
  activityId: string;
  status: ActivityStatus;
};

export function ActivityStatusSelect({ activityId, status }: ActivityStatusSelectProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ActivityStatus>(status);

  useEffect(() => {
    setSelectedStatus(status);
  }, [status]);

  async function handleChange(nextStatus: ActivityStatus) {
    setSelectedStatus(nextStatus);
    setIsSaving(true);
    const formData = new FormData();
    formData.set("activityId", activityId);
    formData.set("status", nextStatus);

    try {
      await updateActivityStatusAction(formData);
    } finally {
      setIsSaving(false);
      router.refresh();
    }
  }

  return (
    <div className="inline-flex items-center">
      <select
        value={selectedStatus}
        disabled={isSaving}
        onChange={(event) => handleChange(event.target.value as ActivityStatus)}
        className="rounded-md border border-zinc-200 px-2 py-1 text-xs"
        aria-label="Cambiar estado de actividad"
      >
        {Object.values(ActivityStatus).map((nextStatus) => (
          <option key={nextStatus} value={nextStatus}>
            {activityStatusLabel(nextStatus)}
          </option>
        ))}
      </select>
    </div>
  );
}
