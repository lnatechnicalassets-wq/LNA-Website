export const catalogPublishCopy = {
  courses: {
    action: "Publish course",
    description: "The saved course will be visible at its public URL.",
    success: "Course published.",
  },
  batches: {
    action: "Publish as upcoming",
    description: "The saved batch will be visible on its course page as Upcoming.",
    success: "Batch published as upcoming.",
  },
  heading: "Publishing",
  savedVersion: "Save any edits before publishing. Publishing uses the saved version.",
  cancel: "Cancel",
  publishing: "Publishing…",
  stale: "This record changed. Reload the page before publishing.",
  unavailable: "Publishing failed. Try again shortly.",
  parent: "Publish the parent course before publishing this batch.",
} as const;
