import { queryOptions } from "@tanstack/react-query";
import { api } from "./api";

/* --------------------------------------------------------------- entities */

export type DashUser = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  roles: string[];
  is_active: boolean;
  createdAt?: string;
};

export type BatchRow = {
  id: string;
  name: string;
  grade?: string | null;
  schedule?: string | null;
  room?: string | null;
  status?: string;
  studentCount?: number;
  assignmentCount?: number;
  teacher_id?: { _id?: string; full_name?: string; email?: string } | null;
  school_id?: { _id?: string; name?: string; city?: string } | null;
  franchise_id?: { _id?: string; name?: string; city?: string } | null;
};

export type ClassRow = {
  id: string;
  name: string;
  grade?: string | null;
  section?: string | null;
  schedule?: string | null;
  room?: string | null;
  status?: string;
  studentCount?: number;
  teacher_id?: { _id?: string; full_name?: string; email?: string } | null;
  school_id?: { _id?: string; name?: string; city?: string } | null;
  franchise_id?: { _id?: string; name?: string; city?: string } | null;
};

export type TeacherRow = {
  id: string;
  user_id?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  subject?: string | null;
  status?: string;
  hasLogin?: boolean;
  batches?: string[];
  classes?: string[];
};

export type ParentRef = { _id?: string; full_name?: string; email?: string; phone?: string };

export type StudentRow = {
  id: string;
  full_name: string;
  roll_number?: string | null;
  email?: string | null;
  grade?: string | null;
  status?: string;
  batch_id?: { _id?: string; name?: string; grade?: string } | null;
  batch?: { _id?: string; name?: string; grade?: string; schedule?: string } | null;
  class_id?: { _id?: string; name?: string; grade?: string; section?: string } | null;
  parent_id?: ParentRef | null;
  school_id?: { _id?: string; name?: string } | null;
  franchise_id?: { _id?: string; name?: string } | null;
  xpPoints?: number;
  streakDays?: number;
  lastActiveDate?: string | null;
  rankTitle?: string;
  level?: number;
  badges?: BadgeRow[];
};

export type BadgeRow = {
  badgeId: string;
  title: string;
  icon?: string | null;
  unlockedAt?: string | null;
};

export type Gamification = {
  xpPoints: number;
  streakDays: number;
  rankTitle: string;
  level: number;
  xpToNextLevel: number;
  badgeCount: number;
  badges: BadgeRow[];
};

export type EnrolledCourseRow = {
  enrollmentId: string | null;
  courseId: string;
  course: CourseRow;
  progress: number;
  progressPercentage: number;
  totalLessons: number;
  completedLessons: number;
  completedLessonIds: string[];
  certificateId: string | null;
  completedAt?: string | null;
  status: string;
};

export type StudentProfile = {
  student: StudentRow;
  gamification: Gamification;
  courses: EnrolledCourseRow[];
};

export type ContinueLessonRow = {
  enrollmentId: string;
  course: CourseRow;
  lesson: LessonRow & { duration?: number };
  progress: number;
  totalLessons: number;
  completedLessons: number;
  remainingLessons: number;
  resumeUrl: string;
} | null;

export type LiveSessionRow = {
  id: string;
  title: string;
  topic?: string | null;
  meetingUrl?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status: "upcoming" | "live" | "completed";
  teacherName?: string;
  batchName?: string;
  canJoin?: boolean;
};

export type LiveClassesResponse = {
  batch: { id: string; name: string; schedule?: string | null } | null;
  sessions: LiveSessionRow[];
  now: string;
};

export type DiyGuideRow = {
  id: string;
  title: string;
  kitType?: string | null;
  difficulty: "Easy" | "Medium" | "Advanced";
  componentsNeeded: string[];
  circuitDiagramUrl?: string | null;
  codeSnippet?: string | null;
  troubleshootingSteps: string[];
};

export type FeeRow = {
  id: string;
  title?: string;
  amount: number;
  due_date?: string | null;
  status: "pending" | "paid";
  paid_at?: string | null;
  method?: string | null;
  receipt_number?: string;
  createdAt?: string;
  student_id?: { _id?: string; id?: string; full_name?: string; roll_number?: string } | null;
};

export type AssignmentRow = {
  id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  max_marks?: number;
  createdAt?: string;
  batch_id?: { _id?: string; name?: string; grade?: string } | null;
  teacher_id?: string | null;
  submissionCount?: number;
  gradedCount?: number;
  pendingCount?: number;
  status?: "pending" | "submitted" | "graded";
  submission?: SubmissionRow | null;
};

export type SubmissionRow = {
  id: string;
  content?: string | null;
  file_url?: string | null;
  project_url?: string | null;
  marks?: number | null;
  feedback?: string | null;
  status: "submitted" | "graded";
  submitted_at?: string;
  createdAt?: string;
  student_id?: { _id?: string; full_name?: string; roll_number?: string } | null;
  assignment_id?: { _id?: string; title?: string; max_marks?: number } | null;
};

export type CourseRow = {
  id: string;
  title: string;
  slug: string;
  image_url?: string | null;
  short_description?: string | null;
  level?: string | null;
  duration?: string | null;
  price?: number;
};

export type LessonRow = {
  id: string;
  title: string;
  content?: string | null;
  video_url?: string | null;
  duration_minutes?: number | null;
  duration_min?: number | null;
  completed?: boolean;
};

export type EnrollmentRow = {
  enrollmentId: string;
  course: CourseRow;
  lessons: LessonRow[];
  totalLessons: number;
  completedLessons: number;
  progress: number;
};

export type QuizRow = {
  id: string;
  title: string;
  description?: string | null;
  questionCount: number;
  attempts: number;
  bestScore: number | null;
  course_id?: { _id?: string; title?: string } | string | null;
};

export type QuizDetail = {
  id: string;
  title: string;
  description?: string | null;
  questions: { index: number; question: string; options: string[] }[];
  attempts: { id: string; score: number; passed: boolean; createdAt?: string }[];
  course_id?: { _id?: string; title?: string } | string | null;
};

export type CertificateRow = {
  id: string;
  code: string;
  issuedAt?: string;
  progress: number;
  course: CourseRow;
};

export type NotificationRow = {
  id: string;
  title: string;
  message?: string | null;
  link?: string | null;
  read: boolean;
  createdAt?: string;
};

export type OrderRow = {
  id: string;
  order_number: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  shipping_address?: string | null;
  total: number;
  status: string;
  payment_status: string;
  placed_at?: string;
  createdAt?: string;
  itemCount?: number;
  items?: { id: string; name?: string; price?: number; quantity?: number }[];
};

export type EnquiryRow = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  subject?: string | null;
  message?: string | null;
  status: string;
  source?: string;
  createdAt?: string;
  franchise_id?: { _id?: string; name?: string; city?: string } | null;
};

export type SchoolRow = {
  id: string;
  name: string;
  code?: string;
  city?: string | null;
  address?: string | null;
  state?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  lab_status: "pending" | "active";
  status: string;
  students: number;
  teachers: number;
  batches: number;
};

export type FranchiseRow = {
  id: string;
  name: string;
  code?: string;
  city?: string | null;
  address?: string | null;
  territory?: string | null;
  contact_email?: string | null;
  revenue_share: number;
  status: string;
  students: number;
  batches: number;
  revenue: number;
  franchiseShare: number;
  aikidzShare: number;
};

export type OrgOverview = {
  organization: {
    id: string;
    name: string;
    code?: string;
    city?: string | null;
    revenue_share?: number;
    lab_status?: string;
    status?: string;
  };
  kpis: {
    students: number;
    teachers: number;
    batches: number;
    classes: number;
    attendanceRate: number;
    pendingFeesCount: number;
    pendingFeesAmount: number;
    collected: number;
  };
  batches: BatchRow[];
  classes: ClassRow[];
  recentStudents: StudentRow[];
  upcomingBatches: BatchRow[];
};

/* ------------------------------------------------------------- transport */

/** `api()` already adds the `/api` prefix; accept paths written either way. */
const endpoint = (path: string) => path.replace(/^\/api(?=\/|$)/, "") || "/";

export const dashQuery = <T>(key: readonly unknown[], path: string) =>
  queryOptions<T>({ queryKey: key, queryFn: () => api<T>(endpoint(path)) });

export const post = <T>(path: string, body: unknown = {}) =>
  api<T>(endpoint(path), { method: "POST", body: JSON.stringify(body) });

export const patch = <T>(path: string, body: unknown = {}) =>
  api<T>(endpoint(path), { method: "PATCH", body: JSON.stringify(body) });

export const remove = <T>(path: string) => api<T>(endpoint(path), { method: "DELETE" });

/* --------------------------------------------------------------- helpers */

export const refId = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as { id?: unknown; _id?: unknown };
    if (typeof record.id === "string") return record.id;
    if (typeof record._id === "string") return record._id;
  }
  return undefined;
};

export const studentName = (fee: FeeRow) => fee.student_id?.full_name ?? "Student";

export const money = (value: number | string | null | undefined) => {
  const amount = Number(value ?? 0);
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

export const dateLabel = (value: string | null | undefined, withTime = false) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return withTime
    ? date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : date.toLocaleDateString("en-IN", { dateStyle: "medium" });
};

export const todayInput = () => new Date().toISOString().slice(0, 10);
