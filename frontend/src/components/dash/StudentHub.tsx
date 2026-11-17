import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Flame,
  GraduationCap,
  Loader2,
  PlayCircle,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  Trophy,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import {
  dashQuery,
  dateLabel,
  post,
  type AssignmentRow,
  type ContinueLessonRow,
  type DiyGuideRow,
  type Gamification,
  type LiveClassesResponse,
  type LiveSessionRow,
  type StudentProfile,
} from "@/lib/dash.api";
import { downloadCertificatePdf } from "@/lib/pdf";
import { useDashTab } from "@/lib/useDashTab";
import { cn } from "@/lib/utils";
import { DashboardShell, Empty, Panel, ProgressBar, StatCard } from "./DashboardShell";
import { FormDialog } from "./DashKit";
import { EmptyState, ErrorNote, LoadingGrid, TabsNav } from "./DashSections";

type BadgeCatalogEntry = {
  badgeId: string;
  title: string;
  emoji: string;
  requirement: string;
};

const BADGE_CATALOG: BadgeCatalogEntry[] = [
  {
    badgeId: "first-robot-built",
    title: "First Robot Built",
    emoji: "🤖",
    requirement: "Complete your first lesson in any course.",
  },
  {
    badgeId: "sensor-master",
    title: "Sensor Master",
    emoji: "📡",
    requirement: "Finish the sensors and actuators module.",
  },
  {
    badgeId: "course-finisher",
    title: "Course Finisher",
    emoji: "🏆",
    requirement: "Reach 100% in any course.",
  },
  {
    badgeId: "quiz-ace",
    title: "Quiz Ace",
    emoji: "🧠",
    requirement: "Score 100% on any quiz.",
  },
  {
    badgeId: "assignment-hero",
    title: "Assignment Hero",
    emoji: "📝",
    requirement: "Submit your first assignment.",
  },
  {
    badgeId: "streak-starter",
    title: "Streak Starter",
    emoji: "🔥",
    requirement: "Learn 5 days in a row.",
  },
];

const DIFFICULTY_TONE: Record<DiyGuideRow["difficulty"], string> = {
  Easy: "bg-mint/15 text-mint",
  Medium: "bg-sun/20 text-sun-foreground",
  Advanced: "bg-destructive/15 text-destructive",
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "AI";

const timeRange = (session: LiveSessionRow) => {
  if (!session.startTime) return "Schedule to be confirmed";
  const start = new Date(session.startTime);
  const end = session.endTime ? new Date(session.endTime) : null;
  const startLabel = start.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  if (!end) return startLabel;
  const endLabel = end.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return `${startLabel} – ${endLabel}`;
};

function HeroBanner({
  name,
  gamification,
  resume,
}: {
  name: string;
  gamification: Gamification;
  resume: ContinueLessonRow;
}) {
  return (
    <section className="glass-panel glass-highlight relative overflow-hidden rounded-3xl border p-5 sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 left-1/3 size-56 rounded-full bg-sun/20 blur-3xl"
      />

      <div className="relative flex flex-wrap items-center gap-5">
        <span className="grid size-20 shrink-0 place-items-center rounded-3xl bg-gradient-brand font-display text-2xl font-extrabold text-primary-foreground shadow-soft">
          {initialsOf(name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Robotics &amp; AI learning hub
          </p>
          <h2 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">{name}</h2>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-brand px-3 py-1 text-xs font-bold text-primary-foreground shadow-soft">
            ⚡ {gamification.rankTitle} • Level {gamification.level}
          </span>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sun/40 bg-sun/15 px-3 py-1 text-xs font-bold text-sun-foreground">
              🔥 {gamification.streakDays}-Day Streak
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              ⭐ {gamification.xpPoints} XP
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet/25 bg-violet/10 px-3 py-1 text-xs font-bold text-violet">
              🎖️ {gamification.badgeCount} Badges
            </span>
          </div>
        </div>
      </div>

      {resume ? (
        <div className="relative mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
          {resume.course.image_url ? (
            <img
              src={resume.course.image_url}
              alt=""
              className="h-16 w-24 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <span className="grid h-16 w-24 shrink-0 place-items-center rounded-xl bg-gradient-brand text-primary-foreground">
              <BookOpen className="size-6" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              ▶️ Resume learning
            </p>
            <p className="truncate font-semibold">{resume.lesson.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {resume.course.title} · {resume.completedLessons}/{resume.totalLessons} lessons ·{" "}
              {resume.progress}%
            </p>
            <div className="mt-2 max-w-sm">
              <ProgressBar value={resume.progress} />
            </div>
          </div>
          <Button asChild variant="brand" className="rounded-full">
            <Link to="/student/learn/$slug" params={{ slug: resume.course.slug }}>
              <PlayCircle className="size-4" /> Resume Lesson
            </Link>
          </Button>
        </div>
      ) : (
        <div className="relative mt-5 rounded-2xl border border-dashed border-border/70 bg-card/30 p-4 text-sm text-muted-foreground">
          You have finished every lesson in your current courses. Pick a new course to keep the
          streak alive!{" "}
          <Link to="/student/courses" className="font-semibold text-primary">
            Browse courses
          </Link>
          .
        </div>
      )}
    </section>
  );
}

function CourseCard({
  row,
  studentName,
}: {
  row: StudentProfile["courses"][number];
  studentName: string;
}) {
  const completed = row.progress >= 100;
  const code = row.certificateId ?? "AKZ-CERT-DEMO1";
  const download = () => {
    void downloadCertificatePdf({
      studentName,
      courseTitle: row.course.title,
      code,
      issuedAt: row.completedAt ?? new Date().toISOString(),
      verifyUrl: `${window.location.origin}/verify-certificate?code=${encodeURIComponent(code)}`,
    })
      .then(() => toast.success("Certificate downloaded"))
      .catch((error: unknown) => toast.error(errorMessage(error)));
  };

  return (
    <article className="glass-panel glass-hover overflow-hidden rounded-3xl border">
      {row.course.image_url ? (
        <img
          src={row.course.image_url}
          alt=""
          className="h-36 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="grid h-36 w-full place-items-center bg-gradient-brand text-primary-foreground">
          <BookOpen className="size-10" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold">{row.course.title}</h3>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {row.course.short_description ?? "AIKIDZ guided course"}
            </p>
          </div>
          {completed ? (
            <span className="shrink-0 rounded-full bg-mint/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mint">
              Completed
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <ProgressBar value={row.progress} />
          <span className="text-xs font-bold tabular-nums">{row.progress}%</span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {row.completedLessons} of {row.totalLessons} lessons complete
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {completed ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-mint/40 bg-mint/15 text-mint hover:bg-mint/25 hover:text-mint"
              onClick={download}
            >
              <Download className="size-4" /> Download Certificate
            </Button>
          ) : (
            <Button asChild variant="brand" size="sm" className="rounded-full">
              <Link to="/student/learn/$slug" params={{ slug: row.course.slug }}>
                <PlayCircle className="size-4" /> Continue
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/student/learn/$slug" params={{ slug: row.course.slug }}>
              {completed ? "Review course" : "Open lessons"}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function LiveCard({ session }: { session: LiveSessionRow }) {
  const live = session.status === "live";
  return (
    <article
      className={cn(
        "glass-panel rounded-3xl border p-5",
        live && "border-destructive/40 ring-2 ring-destructive/30",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {session.batchName ?? "Your batch"}
          </p>
          <h3 className="mt-1 text-base font-bold">{session.title}</h3>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {session.topic ?? "Live robotics session"}
          </p>
        </div>
        {live ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
            </span>
            Class is LIVE now
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
            <Clock className="size-3.5" /> Upcoming
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5" /> {timeRange(session)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <GraduationCap className="size-3.5" /> {session.teacherName ?? "AIKIDZ instructor"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {session.meetingUrl ? (
          <Button asChild variant={live ? "brand" : "outline"} size="sm" className="rounded-full">
            <a href={session.meetingUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> {live ? "Join Class" : "Join class link"}
            </a>
          </Button>
        ) : (
          <Button size="sm" className="rounded-full" disabled>
            Link coming soon
          </Button>
        )}
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
          {session.canJoin ? "Doors are open" : "Doors open 5 min before"}
        </span>
      </div>
    </article>
  );
}

function DiyCard({ guide }: { guide: DiyGuideRow }) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copying, setCopying] = useState(false);

  const copyCode = async () => {
    if (!guide.codeSnippet) return;
    setCopying(true);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard is unavailable");
      await navigator.clipboard.writeText(guide.codeSnippet);
      toast.success("Code copied — paste it into your Arduino IDE");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setCopying(false);
    }
  };

  const doneCount = guide.componentsNeeded.filter((item) => checked[item]).length;

  return (
    <article className="glass-panel rounded-3xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                DIFFICULTY_TONE[guide.difficulty],
              )}
            >
              {guide.difficulty}
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {guide.kitType ?? "AIKIDZ DIY kit"}
            </span>
          </div>
          <h3 className="mt-2 text-base font-bold">{guide.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {guide.componentsNeeded.length} components · {doneCount} gathered
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <Wrench className="size-4" /> {open ? "Hide guide" : "Open guide"}
          {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </Button>
      </div>

      {open ? (
        <div className="mt-5 space-y-5 border-t pt-5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Components checklist
            </h4>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {guide.componentsNeeded.map((component) => (
                <li key={component}>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(checked[component])}
                      onChange={(event) =>
                        setChecked((previous) => ({
                          ...previous,
                          [component]: event.target.checked,
                        }))
                      }
                      className="mt-0.5 size-4 rounded border-border accent-primary"
                    />
                    <span
                      className={cn(checked[component] && "text-muted-foreground line-through")}
                    >
                      {component}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Wiring diagram
            </h4>
            {guide.circuitDiagramUrl ? (
              <img
                src={guide.circuitDiagramUrl}
                alt={`Wiring diagram for ${guide.title}`}
                className="mt-2 max-h-64 w-full rounded-2xl border object-cover"
                loading="lazy"
              />
            ) : (
              <div className="mt-2 grid h-40 place-items-center rounded-2xl border border-dashed text-xs text-muted-foreground">
                Diagram coming soon
              </div>
            )}
          </div>

          {guide.codeSnippet ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Sample code
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => void copyCode()}
                  disabled={copying}
                >
                  {copying ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  Copy Code
                </Button>
              </div>
              <pre className="mt-2 max-h-72 overflow-auto rounded-2xl bg-slate-950/95 p-4 text-[12px] leading-relaxed text-slate-100">
                <code>{guide.codeSnippet}</code>
              </pre>
            </div>
          ) : null}

          {guide.troubleshootingSteps.length ? (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Troubleshooting tips
              </h4>
              <ul className="mt-2 space-y-1.5 text-sm">
                {guide.troubleshootingSteps.map((step, index) => (
                  <li key={`${guide.id}-tip-${index}`} className="flex items-start gap-2">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-sun/20 text-[10px] font-bold text-sun-foreground">
                      {index + 1}
                    </span>
                    <span className="text-foreground/90">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function BadgeCard({
  title,
  emoji,
  requirement,
  unlockedAt,
}: {
  title: string;
  emoji: string;
  requirement: string;
  unlockedAt?: string | null | undefined;
}) {
  const unlocked = Boolean(unlockedAt);
  return (
    <article
      className={cn(
        "glass-panel rounded-3xl border p-5 text-center transition",
        unlocked
          ? "border-sun/50 bg-sun/10 shadow-[0_0_32px_-12px_rgba(241,183,93,0.8)]"
          : "grayscale opacity-60",
      )}
    >
      <div
        className={cn(
          "mx-auto grid size-16 place-items-center rounded-2xl text-3xl",
          unlocked ? "bg-sun/20" : "bg-muted/60",
        )}
      >
        <span aria-hidden>{emoji}</span>
      </div>
      <h3 className="mt-3 text-sm font-bold">{title}</h3>
      {unlocked ? (
        <p className="mt-1 text-[11px] font-semibold text-mint">
          Unlocked {unlockedAt ? dateLabel(unlockedAt) : ""}
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-muted-foreground">{requirement}</p>
      )}
    </article>
  );
}

function AssignmentSubmitDialog({
  assignment,
  onClose,
  onSubmitted,
}: {
  assignment: AssignmentRow | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const submit = async (values: Record<string, string>) => {
    if (!assignment) return;
    const content = values["content"]?.trim() ?? "";
    const projectUrl = values["projectUrl"]?.trim() ?? "";
    const fileUrl = values["fileUrl"]?.trim() ?? "";
    if (!content && !projectUrl && !fileUrl) {
      toast.error("Add your explanation, a project link or a file link");
      return;
    }
    const result = await post<{ xpAwarded?: number; badgeAwarded?: string | null }>(
      `/api/student/assignments/${assignment.id}/submit`,
      { content, projectUrl, fileUrl },
    );
    toast.success(
      result.xpAwarded
        ? `Work submitted! +${result.xpAwarded} XP${result.badgeAwarded ? " · new badge!" : ""}`
        : "Work submitted for grading!",
    );
    onSubmitted();
    onClose();
  };

  return (
    <FormDialog
      open={Boolean(assignment)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`Submit · ${assignment?.title ?? "assignment"}`}
      description="Explain what you built, then add a GitHub or Drive link so your teacher can review it."
      fields={[
        {
          name: "content",
          label: "Your explanation",
          type: "textarea",
          placeholder: "Describe your build, the parts you used and what you learned…",
        },
        {
          name: "projectUrl",
          label: "Project / video link",
          placeholder: "https://github.com/… or https://drive.google.com/…",
        },
        {
          name: "fileUrl",
          label: "File link (optional)",
          placeholder: "https://…",
        },
      ]}
      submitLabel="Submit work"
      onSubmit={submit}
    />
  );
}

export function StudentHub() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  const [tab, setTab] = useDashTab("courses");
  const [submitting, setSubmitting] = useState<AssignmentRow | null>(null);

  const profileQuery = useQuery(
    dashQuery<StudentProfile>(["student", "hub", "profile"], "/api/student/profile"),
  );
  const continueQuery = useQuery(
    dashQuery<ContinueLessonRow>(["student", "hub", "continue"], "/api/student/continue-lesson"),
  );
  const liveQuery = useQuery(
    dashQuery<LiveClassesResponse>(["student", "hub", "live"], "/api/student/live-classes"),
  );
  const diyQuery = useQuery(
    dashQuery<DiyGuideRow[]>(["student", "hub", "diy"], "/api/student/diy-guides"),
  );
  const assignmentsQuery = useQuery(
    dashQuery<AssignmentRow[]>(["student", "hub", "assignments"], "/api/student/assignments"),
  );

  const data = profileQuery.data;
  const gamification = data?.gamification;
  const studentName =
    data?.student.full_name ?? profile?.full_name ?? user?.full_name ?? "AIKIDZ learner";
  const firstName = studentName.split(" ")[0] ?? "there";
  const assignments = assignmentsQuery.data ?? [];
  const pendingAssignments = assignments.filter((row) => !row.submission);
  const doneAssignments = assignments.filter((row) => Boolean(row.submission));
  const sessions = liveQuery.data?.sessions ?? [];
  const guides = diyQuery.data ?? [];
  const unlockedBadges = gamification?.badges ?? [];
  const knownBadgeIds = new Set(BADGE_CATALOG.map((badge) => badge.badgeId));
  const extraBadges = unlockedBadges.filter((badge) => !knownBadgeIds.has(badge.badgeId));

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["student"] });
  };

  return (
    <DashboardShell
      role="student"
      title={`Hi ${firstName}! 👋`}
      subtitle="Your robotics & AI learning hub — courses, live classes, projects and badges."
      actions={
        <Button variant="outline" size="sm" className="rounded-full" onClick={refresh}>
          <RefreshCw className="size-4" /> Refresh
        </Button>
      }
    >
      {profileQuery.isLoading ? (
        <LoadingGrid cards={3} rows={2} />
      ) : profileQuery.isError ? (
        <ErrorNote message="Could not load your learning profile. Please refresh." />
      ) : !data || !gamification ? (
        <Empty>
          Your student profile isn&apos;t linked yet. Ask an AIKIDZ admin to connect it.
        </Empty>
      ) : (
        <div className="space-y-6">
          <HeroBanner
            name={studentName}
            gamification={gamification}
            resume={continueQuery.data ?? null}
          />

          <Tabs value={tab} onValueChange={setTab}>
            <TabsNav
              tabs={[
                { value: "courses", label: "📚 My Courses & LMS" },
                { value: "live", label: "🚀 Live Classes" },
                {
                  value: "assignments",
                  label: "📝 Assignments",
                  badge: pendingAssignments.length || undefined,
                },
                { value: "diy", label: "🛠️ DIY Lab" },
                { value: "badges", label: "🎖️ Badges" },
              ]}
            />

            <TabsContent value="courses" className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Courses enrolled"
                  value={data.courses.length}
                  icon={BookOpen}
                  hint={`${data.courses.filter((row) => row.progress >= 100).length} completed`}
                />
                <StatCard
                  label="Average progress"
                  value={`${
                    data.courses.length
                      ? Math.round(
                          data.courses.reduce((total, row) => total + row.progress, 0) /
                            data.courses.length,
                        )
                      : 0
                  }%`}
                  icon={Flame}
                  tone="sun"
                />
                <StatCard
                  label="Certificates earned"
                  value={data.courses.filter((row) => row.progress >= 100).length}
                  icon={Award}
                  tone="mint"
                />
              </div>

              {data.courses.length === 0 ? (
                <EmptyState
                  action={
                    <Button asChild variant="brand" className="rounded-full">
                      <Link to="/student/courses">Browse courses</Link>
                    </Button>
                  }
                >
                  You haven&apos;t enrolled in a course yet.
                </EmptyState>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {data.courses.map((row) => (
                    <CourseCard key={row.courseId} row={row} studentName={studentName} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="live" className="space-y-6">
              <Panel
                title="Live class schedule"
                description={
                  liveQuery.data?.batch
                    ? `${liveQuery.data.batch.name} · ${liveQuery.data.batch.schedule ?? "Schedule shared by your teacher"}`
                    : "Sessions for your batch"
                }
                action={
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <CalendarDays className="size-3.5" /> {sessions.length} scheduled
                  </span>
                }
              >
                {liveQuery.isLoading ? (
                  <LoadingGrid cards={1} rows={0} />
                ) : liveQuery.isError ? (
                  <ErrorNote message="Could not load the live schedule. Please refresh." />
                ) : sessions.length === 0 ? (
                  <EmptyState>No live classes scheduled right now. Check back soon.</EmptyState>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {sessions.map((session) => (
                      <LiveCard key={session.id} session={session} />
                    ))}
                  </div>
                )}
              </Panel>
            </TabsContent>

            <TabsContent value="assignments" className="space-y-6">
              <Panel
                title={`To Do (${pendingAssignments.length})`}
                description="Submit your write-up and a project or video link before the due date."
              >
                {assignmentsQuery.isLoading ? (
                  <LoadingGrid cards={1} rows={0} />
                ) : assignmentsQuery.isError ? (
                  <ErrorNote message="Could not load assignments. Please refresh." />
                ) : pendingAssignments.length === 0 ? (
                  <EmptyState>You&apos;re all caught up — nothing pending. 🎉</EmptyState>
                ) : (
                  <div className="space-y-4">
                    {pendingAssignments.map((assignment) => (
                      <div key={assignment.id} className="glass-tile rounded-2xl border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold">{assignment.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Due {dateLabel(assignment.due_date)} · {assignment.max_marks ?? 100}{" "}
                              marks
                            </p>
                          </div>
                          <Button
                            variant="brand"
                            size="sm"
                            className="rounded-full"
                            onClick={() => setSubmitting(assignment)}
                          >
                            <Send className="size-4" /> Submit Work
                          </Button>
                        </div>
                        {assignment.description ? (
                          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                            {assignment.description}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel
                title={`Submitted & Graded (${doneAssignments.length})`}
                description="Marks and feedback appear here as soon as your teacher grades your work."
              >
                {doneAssignments.length === 0 ? (
                  <EmptyState>Nothing submitted yet.</EmptyState>
                ) : (
                  <ul className="divide-y">
                    {doneAssignments.map((assignment) => {
                      const submission = assignment.submission;
                      const graded = submission?.status === "graded";
                      return (
                        <li key={assignment.id} className="py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="min-w-0 flex-1 truncate font-semibold">
                              {assignment.title}
                            </span>
                            {graded ? (
                              <span className="rounded-full bg-mint/15 px-2.5 py-0.5 text-xs font-bold text-mint">
                                {submission?.marks ?? 0}/{assignment.max_marks ?? 100}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sun/20 px-2.5 py-0.5 text-xs font-semibold text-sun-foreground">
                                <Clock className="size-3" /> Awaiting grading
                              </span>
                            )}
                            {!graded ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                                onClick={() => setSubmitting(assignment)}
                              >
                                Update work
                              </Button>
                            ) : null}
                          </div>

                          {submission?.content ? (
                            <p className="mt-2 whitespace-pre-line rounded-xl bg-secondary/40 p-3 text-sm">
                              {submission.content}
                            </p>
                          ) : null}

                          <div className="mt-2 flex flex-wrap gap-3 text-xs">
                            {submission?.project_url ? (
                              <a
                                href={submission.project_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                              >
                                <ExternalLink className="size-3.5" /> Project link
                              </a>
                            ) : null}
                            {submission?.file_url ? (
                              <a
                                href={submission.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                              >
                                <ExternalLink className="size-3.5" /> Submitted file
                              </a>
                            ) : null}
                          </div>

                          {graded && submission?.feedback ? (
                            <div className="mt-3 flex items-start gap-2 rounded-xl border border-mint/30 bg-mint/10 p-3 text-sm">
                              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-mint" />
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wide text-mint">
                                  Teacher feedback
                                </p>
                                <p className="text-foreground/90">{submission.feedback}</p>
                              </div>
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            </TabsContent>

            <TabsContent value="diy" className="space-y-6">
              <div className="glass-panel flex flex-wrap items-center gap-3 rounded-3xl border p-4 text-sm text-muted-foreground">
                <Sparkles className="size-5 text-sun-foreground" />
                Pick a kit, tick off the components, copy the sample code and start building. Each
                guide includes wiring and troubleshooting help.
              </div>
              {diyQuery.isLoading ? (
                <LoadingGrid cards={2} rows={0} />
              ) : diyQuery.isError ? (
                <ErrorNote message="Could not load DIY guides. Please refresh." />
              ) : guides.length === 0 ? (
                <EmptyState>DIY guides are being prepared. Check back soon.</EmptyState>
              ) : (
                <div className="space-y-4">
                  {guides.map((guide) => (
                    <DiyCard key={guide.id} guide={guide} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="badges" className="space-y-6">
              <Panel
                title={`Badge collection (${gamification.badgeCount})`}
                description="Keep learning to unlock every glowing badge — locked ones show exactly what to do."
              >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {BADGE_CATALOG.map((badge) => {
                    const unlocked = unlockedBadges.find(
                      (entry) => entry.badgeId === badge.badgeId,
                    );
                    return (
                      <BadgeCard
                        key={badge.badgeId}
                        title={badge.title}
                        emoji={badge.emoji}
                        requirement={badge.requirement}
                        unlockedAt={unlocked?.unlockedAt ?? null}
                      />
                    );
                  })}
                  {extraBadges.map((badge) => (
                    <BadgeCard
                      key={badge.badgeId}
                      title={badge.title}
                      emoji="🎖️"
                      requirement="Unlocked"
                      unlockedAt={badge.unlockedAt ?? null}
                    />
                  ))}
                </div>
              </Panel>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="glass-panel flex items-center gap-4 rounded-3xl border p-5">
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Star className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      XP to next level
                    </p>
                    <p className="font-display text-2xl font-extrabold">
                      {gamification.xpToNextLevel} XP
                    </p>
                  </div>
                </div>
                <div className="glass-panel flex items-center gap-4 rounded-3xl border p-5">
                  <span className="grid size-12 place-items-center rounded-2xl bg-sun/20 text-sun-foreground">
                    <Trophy className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Current rank
                    </p>
                    <p className="font-display text-2xl font-extrabold">{gamification.rankTitle}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      <AssignmentSubmitDialog
        assignment={submitting}
        onClose={() => setSubmitting(null)}
        onSubmitted={refresh}
      />
    </DashboardShell>
  );
}
