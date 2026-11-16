import { z } from "zod";
import {
  isMentorAsset,
  linkedinProfile,
  mentorExpertise,
  parseMentorExpertise,
} from "./mentor-profile";
import { manualStudentSchema } from "./admin-manual-admission";

export const peopleCopy = {
  mentors: "Mentors",
  students: "Students",
  addMentor: "Add mentor",
  addStudent: "Add student",
  active: "Active",
  archived: "Archived",
  edit: "Edit",
  archive: "Archive",
  restore: "Restore",
  cancel: "Cancel",
  confirm: "Confirm",
  view: "View",
  close: "Close",
  save: "Save changes",
  searchMentors: "Search mentors",
  searchStudents: "Search students",
  search: "Search",
  noMentors: "No mentors match this view.",
  noStudents: "No students match this view.",
  mentorDetails: "Mentor profile",
  profileDetails: "Profile details",
  mentorImages: "Images",
  openPreview: "Go to preview",
  uploadImage: "Upload",
  replaceUpload: "Replace",
  existingImages: "Choose an existing image",
  studentDetails: "Student profile",
  profile: "Profile",
  manageStudent: (name: string) => `Manage ${name}`,
  viewStudentProfile: (name: string) => `View profile for ${name}`,
  manageDescription: "Edit details, archive, or delete the profile permanently.",
  studentColumn: "Student",
  contactColumn: "Phone & university",
  actions: "Actions",
  studentSearchPlaceholder: "Name, email, phone, or university",
  clearSearch: "Clear search",
  noStudentsTitle: "No students found",
  noStudentsHelp: "New profiles appear here after you add a student or confirm an enrollment.",
  noArchivedStudents: "Archived profiles will appear here.",
  noMatchingStudents: "Try a different name, email, phone number, or university.",
  studentCount: (count: number) => `${count} ${count === 1 ? "student" : "students"}`,
  moreCourses: (count: number) => `+${count} more`,
  deleteStudent: "Delete permanently",
  deleteStudentTitle: (name: string) => `Delete ${name} permanently?`,
  deleteStudentDescription:
    "Delete this profile, its course history, and any unpaid or test enrollments, including eligible test payments. A real or unresolved payment blocks deletion. You can’t undo this action.",
  deleteStudentConfirmation: (email: string) => `Type ${email} to confirm.`,
  deleteStudentMismatch: "Enter the student's current email address to confirm.",
  deleteStudentPaymentProtected:
    "This student has a payment record that requires reconciliation. No records were deleted.",
  deleteStudentConflict:
    "A linked enrollment also matches another student. Resolve the contact details before deleting.",
  deleteStudentBusy: "An enrollment update is in progress. Try again in a moment.",
  deleteStudentSetup:
    "Permanent deletion is unavailable. Apply the latest Supabase migration and try again.",
  deleteStudentFailed: "The student could not be deleted. Refresh the list and try again.",
  studentDeleted: "Student deleted.",
  history: "Course history",
  courses: "Courses",
  enrolledCourses: "Already enrolled",
  previousCourses: "Previous courses",
  noEnrollments: "No current enrollments.",
  noPreviousCourses: "No previous courses recorded.",
  addPreviousCourse: "Add previous course",
  searchCourses: "Search courses",
  noMatchingCourses: "No courses match your search.",
  loadingCourses: "Loading courses…",
  loadingBatches: "Loading batches…",
  noPastBatches: "No past batches are listed for this course.",
  batchUnknown: "Batch unknown",
  added: "Added",
  addCourseBatch: (label: string) => `Add ${label}`,
  courseAdded: "Previous course added.",
  completionDateSaved: "Completion date saved.",
  addCompletionDate: "Add date",
  editCompletionDate: "Edit date",
  invalidCompletionDate: "Choose a completion date that is today or earlier.",
  courseSaveFailed:
    "Could not save the previous course. Check that the latest migration is applied and try again.",
  courseLoadFailed: "Could not load course options. Please try again.",
  pastEnrollment: "Past enrollment",
  studentCoursesLabel: (name: string) => `Courses for ${name}`,
  studentDangerDescription:
    "Permanently remove this student and the eligible records shown in the preview.",
  noCourses: "No courses recorded.",
  enrolled: "Enrolled",
  completed: "Completed",
  name: "Full name",
  role: "Role",
  company: "Company",
  bio: "Short biography",
  photo: "Portrait",
  logo: "Company logo",
  cardPreview: "Website preview",
  previewCard: "Show card",
  previewDetails: "Show details",
  linkedIn: "LinkedIn profile URL",
  linkedInInvalid: "Enter a LinkedIn profile URL starting with https://www.linkedin.com/in/.",
  expertise: "Expertise",
  expertiseHelp: "Add up to 12 areas of expertise. Use a separate line or a comma for each one.",
  expertiseInvalid: "Use up to 12 areas of expertise, each with at most 80 characters.",
  showMentor: "Show on the website",
  mentorDraft: "Draft",
  mentorPublished: "Published",
  existingImage: (label: string) => `Use existing ${label.toLowerCase()}`,
  automaticImage: "Automatic",
  savedImage: "Current uploaded image",
  clearUpload: "Clear selected file",
  mediaSelected: (name: string) => `Selected ${name}`,
  mediaProcessing: "Preparing image…",
  mediaInvalid: "Choose a valid JPG, PNG, or WebP image up to 15 MB.",
  mediaUploadFailed: "The image could not be uploaded. Please try again.",
  mentorSaveNotReady:
    "Mentor editing is unavailable. Check that the latest Supabase migrations are applied to this environment.",
  mentorSaveInvalid:
    "The database rejected one of the profile fields. Check the name, role, company, biography, LinkedIn URL, and expertise.",
  mentorSaveMissing:
    "This mentor profile is no longer available. Close the editor and refresh the list.",
  mentorSaveFailed:
    "The profile could not be saved. Your changes are still in the form. Please try again.",
  email: "Email",
  phone: "Phone",
  university: "University",
  missing: "Not recorded",
  archivedDescription: "Move this profile to Archived. Its history and links are kept.",
  restoreDescription: "Return this profile to the active directory.",
  mentorDescription: "Manage mentor profiles and their details.",
  studentDescription: "Manage student contacts and view their course history.",
  studentContactDescription: "Update the student’s contact details.",
  completion: "Record a completed course",
  completionOptional: "Optional. Use this for a course the student has already completed.",
  chooseCourse: "Select a completed course",
  course: "Course",
  cohort: "Cohort",
  courseNone: "No course selected",
  cohortNone: "Cohort unknown or unlisted",
  completedOn: "Completion date",
  failed: "The profile could not be saved.",
  invalid: "Check the fields and try again.",
  stale: "This profile changed. Close the form and refresh before editing.",
  duplicate:
    "A student profile already uses this email and phone combination. Find that profile to add course history.",
  recorded: "This course and cohort are already recorded.",
  saved: "Profile saved.",
  previous: "Previous",
  next: "Next",
  page: "Page",
  batchSearch: "Search by mentor or company",
  assigned: "Assigned",
  inherited: "Course mentor",
  removeMentor: "Remove mentor",
  addToBatch: "Add to cohort",
  addPrompt: (name: string, course: string, batch: string) =>
    `Add ${name} as a mentor for ${course}, ${batch}?`,
  removePrompt: (name: string, course: string, batch: string) =>
    `Remove ${name} from the mentor roster for ${course}, ${batch}?`,
} as const;

export const peopleQuery = z.object({
  q: z.string().trim().max(80).catch(""),
  archived: z.literal("1").optional().catch(undefined),
  page: z
    .string()
    .regex(/^[1-9][0-9]{0,4}$/)
    .transform(Number)
    .catch(1),
});

export const personTarget = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("create") }),
  z.object({
    operation: z.enum(["edit", "archive", "restore"]),
    id: z.string().uuid(),
    revision: z.string().datetime({ offset: true }),
  }),
]);

export const studentDeleteTarget = z.object({
  operation: z.literal("delete"),
  id: z.string().uuid(),
  revision: z.string().datetime({ offset: true }),
});

const optionalAsset = z
  .string()
  .trim()
  .max(240)
  .refine((value) => !value || isMentorAsset(value), peopleCopy.invalid)
  .transform((value) => value || null);
export const mentorInput = z.object({
  name: z.string().trim().min(2).max(120),
  role: z.string().trim().min(2).max(160),
  company: z.string().trim().min(2).max(160),
  bio: z.string().trim().min(10).max(2200),
  photo: optionalAsset,
  logo: optionalAsset,
  linkedIn: z
    .string()
    .trim()
    .max(240)
    .refine((value) => !value || linkedinProfile.test(value), peopleCopy.linkedInInvalid)
    .transform((value) => value || null),
  expertise: z.string().max(1024).transform(parseMentorExpertise).pipe(mentorExpertise),
  published: z.literal("on").optional().transform(Boolean),
});
export const studentInput = manualStudentSchema.extend({
  university: z.string().trim().max(200),
});

export type StudentCourseRow = {
  key: string;
  title: string;
  batch: string | null;
  completionDate: string | null;
  completionId?: string;
  enrollmentId?: string;
  enrollmentStatus?: string;
  previous: boolean;
};

export type PersonTarget = z.input<typeof personTarget>;
export type StudentDeleteTarget = z.input<typeof studentDeleteTarget>;
export type PeopleQuery = z.infer<typeof peopleQuery>;
export type PeopleResult = { message?: string; success?: boolean };
export type PeopleAction<Target = PersonTarget> = (
  target: Target,
  previous: PeopleResult,
  data: FormData
) => Promise<PeopleResult>;

export interface StaffMentorCard {
  id: string;
  slug: string;
  name: string;
  role: string;
  organization: string;
  portrait_src: string | null;
  company_logo_src: string | null;
}

export const peopleFieldClass =
  "min-h-11 w-full rounded-lg border border-border-default bg-surface-base px-3 py-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";
