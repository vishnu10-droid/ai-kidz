import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock, ExternalLink, GraduationCap, RefreshCw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dashQuery, type LiveClassesResponse, type LiveSessionRow } from "@/lib/dash.api";
import { cn } from "@/lib/utils";
import { DashboardShell, Panel } from "./DashboardShell";
import { EmptyState, ErrorNote, LoadingGrid } from "./DashSections";

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

export function LiveClassCard({ session }: { session: LiveSessionRow }) {
  const live = session.status === "live";
  return (
    <article
      className={cn(
        "glass-tile rounded-2xl border p-4",
        live && "border-destructive/40 ring-2 ring-destructive/30",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {session.batchName ?? "Your batch"}
          </p>
          <h3 className="mt-0.5 truncate text-sm font-bold">{session.title}</h3>
          <p className="truncate text-[11px] text-muted-foreground">
            {session.topic ?? "Live robotics session"}
          </p>
        </div>
        {live ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-bold text-destructive">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-destructive" />
            </span>
            LIVE now
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/70 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            <Clock className="size-3" aria-hidden /> Upcoming
          </span>
        )}
      </div>

      <div className="mt-3 grid gap-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5" aria-hidden /> {timeRange(session)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <GraduationCap className="size-3.5" aria-hidden />{" "}
          {session.teacherName ?? "AIKIDZ instructor"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {session.meetingUrl ? (
          <Button asChild variant={live ? "brand" : "outline"} size="sm" className="rounded-xl">
            <a href={session.meetingUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" aria-hidden /> {live ? "Join class" : "Join link"}
            </a>
          </Button>
        ) : (
          <Button size="sm" className="rounded-xl" disabled>
            Link coming soon
          </Button>
        )}
        <span className="text-[11px] font-semibold text-primary">
          {session.canJoin ? "Doors are open" : "Doors open 5 min before"}
        </span>
      </div>
    </article>
  );
}

/** Full live-class schedule page linked from the student sidebar. */
export function StudentLiveClasses() {
  const qc = useQueryClient();
  const liveQuery = useQuery(
    dashQuery<LiveClassesResponse>(["student", "hub", "live"], "/api/student/live-classes"),
  );

  const sessions = [...(liveQuery.data?.sessions ?? [])]
    .filter((session) => session.status === "live" || session.status === "upcoming")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "live" ? -1 : 1;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

  const liveNow = sessions.filter((session) => session.status === "live").length;

  return (
    <DashboardShell
      role="student"
      title="Live classes"
      subtitle="Join your batch's live robotics and coding sessions with AIKIDZ mentors."
      actions={
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-white/60 bg-white/15 text-white shadow-none backdrop-blur-md hover:border-white hover:bg-white/25 hover:text-white"
          onClick={() => void qc.invalidateQueries({ queryKey: ["student", "hub", "live"] })}
        >
          <RefreshCw className="size-4" aria-hidden /> Refresh
        </Button>
      }
    >
      <Panel
        title="Your schedule"
        description={
          liveQuery.data?.batch
            ? `${liveQuery.data.batch.name} · ${liveQuery.data.batch.schedule ?? "Schedule shared by your teacher"}`
            : "Sessions for your batch"
        }
        action={
          <span className="inline-flex items-center gap-2">
            {liveNow ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-bold text-destructive">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-destructive" />
                </span>
                {liveNow} live
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <CalendarDays className="size-3.5" aria-hidden /> {sessions.length} scheduled
            </span>
          </span>
        }
      >
        {liveQuery.isLoading ? (
          <LoadingGrid cards={2} rows={0} />
        ) : liveQuery.isError ? (
          <ErrorNote message="Could not load the live schedule. Please refresh." />
        ) : sessions.length === 0 ? (
          <EmptyState>No live classes scheduled right now. Check back soon.</EmptyState>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {sessions.map((session) => (
              <LiveClassCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </Panel>

      <div className="glass-panel mt-5 flex items-start gap-3 rounded-2xl border p-4 text-xs text-muted-foreground">
        <Video className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p>
          Join links open your class in a new tab. Keep your kit, notebook and charger ready, and
          test your camera and mic a few minutes early.
        </p>
      </div>
    </DashboardShell>
  );
}
