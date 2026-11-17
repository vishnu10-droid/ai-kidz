import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Download, ShieldCheck } from "lucide-react";
import {
  DashboardShell,
  Empty,
  Panel,
  ProgressBar,
  StatCard,
} from "@/components/dash/DashboardShell";
import { EmptyState, ErrorNote, LoadingGrid } from "@/components/dash/DashSections";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { dashQuery, dateLabel } from "@/lib/dash.api";
import type { CertificateRow } from "@/lib/dash.api";
import { downloadCertificatePdf } from "@/lib/pdf";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/student/certificates")({
  head: () => ({
    meta: [
      ...pageMeta("My Certificates", "Certificates you have earned at AIKIDZ."),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Certificates,
});

function Certificates() {
  const { profile } = useAuth();
  const certificates = useQuery(
    dashQuery<CertificateRow[]>(["student", "certificates"], "/api/student/certificates"),
  );
  const rows = certificates.data ?? [];
  const studentName = profile?.full_name ?? "AIKIDZ student";

  return (
    <DashboardShell
      role="student"
      title="My certificates"
      subtitle="Every course you finish earns a verifiable certificate you can share."
    >
      {certificates.isLoading ? (
        <LoadingGrid rows={1} />
      ) : certificates.isError ? (
        <ErrorNote message="Could not load your certificates. Please refresh." />
      ) : rows.length === 0 ? (
        <Empty>
          Finish all the lessons in a course to earn its certificate.{" "}
          <Link to="/student/courses" className="font-semibold text-primary">
            Go to my courses
          </Link>
          .
        </Empty>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Certificates earned" value={rows.length} icon={Award} tone="mint" />
            <StatCard
              label="Latest certificate"
              value={dateLabel(rows[0]?.issuedAt, true)}
              icon={Award}
              tone="sun"
              hint={rows[0]?.course.title}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {rows.map((certificate) => (
              <Panel key={certificate.id} title={certificate.course.title}>
                <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center">
                  <Award className="mx-auto size-10 text-primary" />
                  <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    AIKIDZ certificate of completion
                  </div>
                  <div className="mt-2 font-display text-2xl font-extrabold">{studentName}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    for completing {certificate.course.title}
                  </div>
                  <div className="mt-4 font-mono text-sm font-semibold">{certificate.code}</div>
                  <div className="text-xs text-muted-foreground">
                    Issued {dateLabel(certificate.issuedAt, true)}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <ProgressBar value={certificate.progress} />
                  <span className="text-xs font-bold tabular-nums">{certificate.progress}%</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="brand"
                    size="sm"
                    className="rounded-full"
                    onClick={() =>
                      void downloadCertificatePdf({
                        studentName,
                        courseTitle: certificate.course.title,
                        code: certificate.code,
                        issuedAt: certificate.issuedAt ?? new Date().toISOString(),
                        verifyUrl: `${window.location.origin}/verify-certificate?code=${encodeURIComponent(certificate.code)}`,
                      })
                    }
                  >
                    <Download className="size-4" /> Download PDF
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link to="/verify-certificate" search={{ code: certificate.code }}>
                      <ShieldCheck className="size-4" /> Verify
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="rounded-full">
                    <Link to="/student/learn/$slug" params={{ slug: certificate.course.slug }}>
                      Review course
                    </Link>
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 && !certificates.isLoading ? (
        <div className="mt-6">
          <EmptyState>
            Certificates appear here automatically once a course reaches 100%.
          </EmptyState>
        </div>
      ) : null}
    </DashboardShell>
  );
}
