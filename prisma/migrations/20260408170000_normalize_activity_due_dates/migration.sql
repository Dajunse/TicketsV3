-- Normalize legacy date-only activities stored at midnight to noon
-- This avoids timezone shifts where activity appears one day earlier in western timezones.
UPDATE "Activity"
SET "dueDate" = "dueDate" + INTERVAL '12 hours'
WHERE DATE_PART('hour', "dueDate") = 0
  AND DATE_PART('minute', "dueDate") = 0
  AND DATE_PART('second', "dueDate") = 0;
