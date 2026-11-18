import { Link } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Flame,
  GraduationCap,
  NotebookPen,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  AssignmentRow,
  ContinueLessonRow,
  Gamification,
  LiveSessionRow,
  StudentProfile,
} from "@/lib/dash.api";
import { cn } from "@/lib/utils";
import { TrendBadge, type GlassTone } from "./Glass";

type Metric = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: GlassTone;
  hint: string;
  trend?: number | null;
};

const iconTone: Record<GlassTone, string> = {
  primary: "bg-primary/10 text-primary",
  violet: "bg-violet/10 text-violet",
  sun: "bg-sun/20 text-sun-foreground",
  mint: "bg-mint/15 text-mint",
};

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  return (
    <article className="glass-panel glass-highlight min-h-[108px] rounded-2xl border p-3 shadow-soft transition-transform hover:-translate-y-0.5 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <span className={cn("grid size-9 place-items-center rounded-xl", iconTone[metric.tone])}>
          <Icon className="size-4" />
        </span>
        {metric.trend !== undefined && <TrendBadge trend={{ value: metric.trend }} />}
      </div>
      <p className="mt-3 font-display text-xl font-extrabold tracking-tight sm:text-2xl">
        {metric.value}
      </p>
      <p className="mt-0.5 text-xs font-semibold sm:text-sm">{metric.label}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{metric.hint}</p>
    </article>
  );
}

function Donut({ value }: { value: number }) {
  const progress = Math.max(0, Math.min(100, value));
  return (
    <div
      className="grid size-28 shrink-0 place-items-center rounded-full sm:size-32"
      style={{
        background: `conic-gradient(#177d98 0 ${progress}%, #49bca7 ${progress}% ${Math.min(100, progress + 22)}%, #efd078 ${Math.min(100, progress + 22)}% 100%)`,
      }}
    >
      <div className="grid size-[76%] place-items-center rounded-full bg-white/85 text-center shadow-inner backdrop-blur">
        <strong className="font-display text-xl font-extrabold">{progress}%</strong>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          complete
        </span>
      </div>
    </div>
  );
}

export function StudentOverview({
  courses,
  gamification,
  resume,
  sessions,
  assignments,
}: {
  courses: StudentProfile["courses"];
  gamification: Gamification;
  resume: ContinueLessonRow;
  sessions: LiveSessionRow[];
  assignments: AssignmentRow[];
}) {
  const [period, setPeriod] = useState<"6M" | "1Y">("6M");
  const completedLessons = courses.reduce((sum, course) => sum + course.completedLessons, 0);
  const totalLessons = courses.reduce((sum, course) => sum + course.totalLessons, 0);
  const averageProgress = courses.length
    ? Math.round(courses.reduce((sum, course) => sum + course.progress, 0) / courses.length)
    : 0;
  const completedCourses = courses.filter((course) => course.progress >= 100).length;
  const pendingAssignments = assignments.filter((assignment) => !assignment.submission).length;
  const upcomingClasses = sessions.filter(
    (session) => session.status === "upcoming" || session.status === "live",
  ).length;
  const bars =
    period === "6M" ? [32, 48, 43, 67, 58, 82] : [22, 31, 44, 52, 63, 57, 74, 68, 84, 71, 88, 94];
  const metrics: Metric[] = [
    {
      label: "Enrolled courses",
      value: courses.length,
      icon: BookOpen,
      tone: "primary",
      hint: `${completedCourses} completed`,
      trend: null,
    },
    {
      label: "Lessons completed",
      value: completedLessons,
      icon: CheckCircle2,
      tone: "mint",
      hint: `${totalLessons} lessons in total`,
      trend: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : null,
    },
    {
      label: "Average progress",
      value: `${averageProgress}%`,
      icon: GraduationCap,
      tone: "violet",
      hint: "Across all courses",
      trend: averageProgress ? 6 : null,
    },
    {
      label: "XP earned",
      value: gamification.xpPoints.toLocaleString("en-IN"),
      icon: Zap,
      tone: "sun",
      hint: `Level ${gamification.level}`,
      trend: gamification.streakDays ? 12 : null,
    },
    {
      label: "Learning streak",
      value: `${gamification.streakDays} days`,
      icon: Flame,
      tone: "sun",
      hint: "Keep it going!",
      trend: gamification.streakDays ? 8 : null,
    },
    {
      label: "Badges unlocked",
      value: gamification.badgeCount,
      icon: Trophy,
      tone: "violet",
      hint: gamification.rankTitle,
      trend: null,
    },
    {
      label: "Assignments due",
      value: pendingAssignments,
      icon: NotebookPen,
      tone: "primary",
      hint: pendingAssignments ? "Ready to submit" : "You are all caught up",
      trend: null,
    },
    {
      label: "Live classes",
      value: upcomingClasses,
      icon: CalendarDays,
      tone: "mint",
      hint: upcomingClasses ? "Upcoming sessions" : "No class scheduled",
      trend: null,
    },
  ];
  return (
    <section className="space-y-4 sm:space-y-5">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.9fr)]">
        <article className="glass-panel glass-highlight overflow-hidden rounded-3xl border p-4 shadow-soft sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-extrabold">Learning activity</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Your completed lessons and learning momentum.
              </p>
            </div>
            <div className="flex rounded-full bg-secondary/70 p-1">
              {(["6M", "1Y"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPeriod(option)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-bold transition",
                    period === option
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex h-28 items-end gap-2 sm:h-32 sm:gap-3">
            {bars.map((value, index) => (
              <div key={index} className="flex h-full flex-1 flex-col justify-end gap-2">
                <div className="min-h-3 overflow-hidden rounded-t-xl bg-primary/10">
                  <div
                    className={cn(
                      "w-full rounded-t-xl",
                      index === bars.length - 1 ? "bg-primary" : "bg-primary/55",
                    )}
                    style={{ height: `${value * 1.1}px` }}
                  />
                </div>
                <span className="text-center text-[10px] text-muted-foreground">
                  {period === "6M" ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][index] : index + 1}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-dashed pt-2">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">{completedLessons}</strong> lessons completed so
              far
            </p>
            <Button asChild size="sm" variant="brand" className="rounded-full">
              <Link
                to={resume ? "/student/learn/$slug" : "/student/courses"}
                {...(resume ? { params: { slug: resume.course.slug } } : {})}
              >
                {resume ? "Continue learning" : "Explore courses"}
              </Link>
            </Button>
          </div>
        </article>
        <article className="glass-panel glass-highlight rounded-3xl border p-4 shadow-soft sm:p-5">
          <h2 className="font-display text-base font-extrabold">Learning progress</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">A snapshot of your course journey.</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <Donut value={averageProgress} />
            <div className="space-y-2 text-[11px] font-semibold">
              <p className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-primary" /> In progress{" "}
                <strong className="ml-auto">
                  {courses.filter((course) => course.progress > 0 && course.progress < 100).length}
                </strong>
              </p>
              <p className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-mint" /> Completed{" "}
                <strong className="ml-auto">{completedCourses}</strong>
              </p>
              <p className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-sun" /> Not started{" "}
                <strong className="ml-auto">
                  {courses.filter((course) => course.progress === 0).length}
                </strong>
              </p>
            </div>
          </div>
        </article>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>
    </section>
  );
}
