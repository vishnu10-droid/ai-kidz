import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Trophy,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  type StudentProfile,
} from "@/lib/dash.api";
import { downloadCertificatePdf } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import { DashboardShell, Empty, Panel, ProgressBar } from "./DashboardShell";
import { FormDialog } from "./DashKit";
import { EmptyState, ErrorNote, LoadingGrid } from "./DashSections";
import { LiveClassCard } from "./StudentLive";
import { StudentOverview } from "./StudentOverview";

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

function CourseRow({
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
    <li className="glass-tile rounded-2xl border p-3 transition hover:border-primary/30">
      <div className="flex items-center gap-3">
        {row.course.image_url ? (
          <img
            src={row.course.image_url}
            alt=""
            className="size-14 shrink-0 rounded-xl object-cover sm:size-16"
            loading="lazy"
          />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-gradient-brand text-primary-foreground sm:size-16">
            <BookOpen className="size-6" aria-hidden />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{row.course.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {row.completedLessons} of {row.totalLessons} lessons
              </p>
            </div>
            {completed ? (
              <span className="shrink-0 rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mint">
                Completed
              </span>
            ) : (
              <span className="shrink-0 text-xs font-bold tabular-nums">{row.progress}%</span>
            )}
          </div>
          <div className="mt-2">
            <ProgressBar value={row.progress} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {completed ? (
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-xl border-mint/40 bg-mint/15 text-mint hover:bg-mint/25 hover:text-mint"
              onClick={download}
              title="Download certificate"
            >
              <Download className="size-4" aria-hidden />
            </Button>
          ) : null}
          <Button asChild variant="brand" size="sm" className="rounded-xl">
            <Link to="/student/learn/$slug" params={{ slug: row.course.slug }}>
              {completed ? "Review" : "Continue"}
            </Link>
          </Button>
        </div>
      </div>
    </li>
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
    <article className="glass-tile rounded-2xl border p-4">
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
          <h3 className="mt-2 text-sm font-bold">{guide.title}</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {guide.componentsNeeded.length} components · {doneCount} gathered
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <Wrench className="size-3.5" aria-hidden /> {open ? "Hide guide" : "Open guide"}
          {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </Button>
      </div>

      {open ? (
        <div className="mt-4 space-y-4 border-t pt-4">
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
                  className="rounded-xl"
                  onClick={() => void copyCode()}
                  disabled={copying}
                >
                  {copying ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  Copy code
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
        "rounded-2xl border p-3 text-center transition",
        unlocked
          ? "border-sun/50 bg-sun/10 shadow-[0_0_24px_-14px_rgba(241,183,93,0.9)]"
          : "border-border/60 bg-secondary/30 grayscale opacity-60",
      )}
    >
      <div
        className={cn(
          "mx-auto grid size-11 place-items-center rounded-xl text-xl",
          unlocked ? "bg-sun/20" : "bg-muted/60",
        )}
      >
        <span aria-hidden>{emoji}</span>
      </div>
      <h3 className="mt-2 truncate text-[11px] font-bold">{title}</h3>
      <p
        className={cn(
          "mt-0.5 line-clamp-2 text-[10px] leading-snug",
          unlocked ? "font-semibold text-mint" : "text-muted-foreground",
        )}
      >
        {unlocked ? `Unlocked ${unlockedAt ? dateLabel(unlockedAt) : ""}` : requirement}
      </p>
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
  const studentId = data?.student.roll_number ?? data?.student.id;
  const assignments = assignmentsQuery.data ?? [];
  const pendingAssignments = assignments.filter((row) => !row.submission);
  const submittedAssignments = assignments.filter((row) => Boolean(row.submission));
  const sessions = [...(liveQuery.data?.sessions ?? [])]
    .filter((session) => session.status === "live" || session.status === "upcoming")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "live" ? -1 : 1;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
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
      displayTitle={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${firstName}`}
      displaySubtitle={`${new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}${studentId ? ` · Student ID: ${studentId}` : ""}`}
      headerVariant="plain"
      searchPlaceholder="Search courses, lessons, projects, and more..."
      title={`Hi ${firstName}! 👋`}
      subtitle="Your robotics & AI learning hub — courses, live classes, projects and badges."
      actions={
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-white/60 bg-white/15 text-white shadow-none backdrop-blur-md hover:border-white hover:bg-white/25 hover:text-white"
          onClick={refresh}
        >
          <RefreshCw className="size-4" aria-hidden /> Refresh
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
        <div className="space-y-6 sm:space-y-8">
          <StudentOverview
            courses={data.courses}
            gamification={gamification}
            resume={continueQuery.data ?? null}
            sessions={sessions}
            assignments={assignments}
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <Panel
              title="My courses"
              description="Pick up where you left off and keep your streak alive."
              action={
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <Link to="/student/courses">All courses</Link>
                </Button>
              }
            >
              {data.courses.length === 0 ? (
                <EmptyState
                  action={
                    <Button asChild variant="brand" size="sm" className="rounded-xl">
                      <Link to="/student/courses">
                        <BookOpen className="size-4" aria-hidden /> Browse courses
                      </Link>
                    </Button>
                  }
                >
                  You haven&apos;t enrolled in a course yet.
                </EmptyState>
              ) : (
                <ul className="space-y-2.5">
                  {data.courses.map((row) => (
                    <CourseRow key={row.courseId} row={row} studentName={studentName} />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Live classes"
              description={
                liveQuery.data?.batch
                  ? `${liveQuery.data.batch.name} · ${liveQuery.data.batch.schedule ?? "Schedule shared by your teacher"}`
                  : "Sessions for your batch"
              }
              action={
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    <CalendarDays className="size-3.5" aria-hidden /> {sessions.length}
                  </span>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <Link to="/student/live">View all</Link>
                  </Button>
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
                <div className="space-y-2.5">
                  {sessions.map((session) => (
                    <LiveClassCard key={session.id} session={session} />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <Panel
              title={`Assignments due (${pendingAssignments.length})`}
              description="Submit your write-up and a project or video link before the due date."
              action={
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <Link to="/student/assignments">All assignments</Link>
                </Button>
              }
            >
              {assignmentsQuery.isLoading ? (
                <LoadingGrid cards={1} rows={0} />
              ) : assignmentsQuery.isError ? (
                <ErrorNote message="Could not load assignments. Please refresh." />
              ) : pendingAssignments.length === 0 ? (
                <EmptyState>You&apos;re all caught up — nothing pending. 🎉</EmptyState>
              ) : (
                <div className="space-y-2.5">
                  {pendingAssignments.map((assignment) => (
                    <div key={assignment.id} className="glass-tile rounded-2xl border p-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{assignment.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Due {dateLabel(assignment.due_date)} · {assignment.max_marks ?? 100}{" "}
                            marks
                          </p>
                        </div>
                        <Button
                          variant="brand"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => setSubmitting(assignment)}
                        >
                          <Send className="size-3.5" aria-hidden /> Submit work
                        </Button>
                      </div>
                      {assignment.description ? (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {assignment.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {submittedAssignments.length ? (
                <p className="mt-3 flex items-center gap-1.5 border-t border-dashed pt-3 text-[11px] text-muted-foreground">
                  <CheckCircle2 className="size-3.5 text-mint" aria-hidden />
                  {submittedAssignments.length} submitted · marks and feedback in{" "}
                  <Link to="/student/assignments" className="font-semibold text-primary">
                    Assignments
                  </Link>
                </p>
              ) : null}
            </Panel>

            <Panel
              title={`Badges (${gamification.badgeCount})`}
              description="Keep learning to unlock every glowing badge."
              action={
                <span className="grid size-8 place-items-center rounded-xl bg-sun/20 text-sun-foreground">
                  <Trophy className="size-4" aria-hidden />
                </span>
              }
            >
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {BADGE_CATALOG.map((badge) => {
                  const unlocked = unlockedBadges.find((entry) => entry.badgeId === badge.badgeId);
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
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-primary/5 px-3 py-2 text-[11px] font-semibold text-primary">
                <span className="inline-flex items-center gap-1.5">
                  <Award className="size-3.5" aria-hidden /> {gamification.rankTitle}
                </span>
                <span>{gamification.xpToNextLevel} XP to next level</span>
              </div>
            </Panel>
          </div>

          <Panel
            title="DIY lab"
            description="Pick a kit, tick off the components, copy the sample code and start building."
            action={
              <span className="grid size-8 place-items-center rounded-xl bg-sun/20 text-sun-foreground">
                <Sparkles className="size-4" aria-hidden />
              </span>
            }
          >
            {diyQuery.isLoading ? (
              <LoadingGrid cards={1} rows={0} />
            ) : diyQuery.isError ? (
              <ErrorNote message="Could not load DIY guides. Please refresh." />
            ) : guides.length === 0 ? (
              <EmptyState>DIY guides are being prepared. Check back soon.</EmptyState>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {guides.map((guide) => (
                  <DiyCard key={guide.id} guide={guide} />
                ))}
              </div>
            )}
          </Panel>
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
