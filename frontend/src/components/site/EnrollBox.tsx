import { Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { selectClass } from "@/components/site/FormField";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { startCoursePurchase, verifyCoursePayment } from "@/lib/courses.functions";
import { getPaymentConfig } from "@/lib/orders.functions";
import { formatINR } from "@/lib/pricing";
import { payWithRazorpay } from "@/lib/razorpay-client";

type Learner = { id: string; full_name: string; self: boolean };

/** "Enroll now" for students (themselves) and parents (one of their children). */
export function EnrollBox({ courseId, courseSlug, price }: { courseId: string; courseSlug: string; price: number }) {
  const { user, roles, profile, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const start = useServerFn(startCoursePurchase);
  const verify = useServerFn(verifyCoursePayment);
  const [busy, setBusy] = useState(false);
  const [learnerId, setLearnerId] = useState("");

  const { data: config } = useQuery({ queryKey: ["payment-config"], queryFn: () => getPaymentConfig(), staleTime: 300_000 });
  const { data: learners = [], isPending: learnersLoading } = useQuery({
    queryKey: ["my-learners", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<Learner[]> => {
      const [self, parent] = await Promise.all([
        supabase.from("students").select("id, full_name").eq("user_id", user!.id).maybeSingle(),
        supabase.from("parents").select("id").eq("user_id", user!.id).maybeSingle(),
      ]);
      const kids = parent.data ? ((await supabase.from("students").select("id, full_name").eq("parent_id", parent.data.id).order("created_at")).data ?? []) : [];
      return [...(self.data ? [{ ...self.data, self: true }] : []), ...kids.map((k) => ({ ...k, self: false }))];
    },
  });
  const { data: enrolledIds = [] } = useQuery({
    queryKey: ["course-enrolled", courseId, learners.map((l) => l.id).join(",")],
    enabled: learners.length > 0,
    queryFn: async () => ((await supabase.from("enrollments").select("student_id").eq("course_id", courseId).in("student_id", learners.map((l) => l.id))).data ?? []).map((e) => e.student_id),
  });

  useEffect(() => {
    if (!learnerId && learners[0]) setLearnerId(learners.find((l) => !enrolledIds.includes(l.id))?.id ?? learners[0].id);
  }, [learners, enrolledIds, learnerId]);

  const free = price <= 0;
  const online = config?.razorpay ?? false;

  if (loading) return <Button variant="brand" className="mt-6 w-full" disabled><Loader2 className="animate-spin" /></Button>;

  if (!user) {
    return (
      <Button asChild variant="brand" className="mt-6 w-full">
        <Link to="/login" search={{ redirect: `/courses/${courseSlug}` }}>Sign in to enroll</Link>
      </Button>
    );
  }

  if (!learnersLoading && learners.length === 0) {
    const isParent = roles.includes("parent");
    return (
      <div className="mt-6 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
        {isParent ? <>Add your child on your <Link to="/parent/dashboard" className="font-semibold text-primary underline">parent dashboard</Link> first, then enrol them here.</> : "Online enrolment is for student and parent accounts. Talk to an advisor to enrol learners from your school or centre."}
      </div>
    );
  }

  const selected = learners.find((l) => l.id === learnerId);
  const alreadyEnrolled = selected ? enrolledIds.includes(selected.id) : false;

  async function enroll() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await start({ data: { courseId, studentId: selected.id } });
      if (res.razorpay) {
        const proof = await payWithRazorpay({
          key: res.razorpay.keyId,
          amount: res.razorpay.amount,
          currency: res.razorpay.currency,
          order_id: res.razorpay.orderId,
          name: "AIKIDZ",
          description: res.razorpay.description,
          prefill: { name: profile?.full_name ?? undefined, email: user?.email ?? undefined, contact: profile?.phone ?? undefined },
          theme: { color: "#2563EB" },
        });
        if (!proof) {
          toast("Payment cancelled. You can try again any time.");
          return;
        }
        await verify({ data: { razorpayOrderId: proof.razorpay_order_id, razorpayPaymentId: proof.razorpay_payment_id, razorpaySignature: proof.razorpay_signature } });
      }
      toast.success(`${selected.full_name} is enrolled!`);
      await qc.invalidateQueries();
      void router.navigate({ to: selected.self ? "/student/courses" : "/parent/dashboard" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      {learners.length > 1 && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Enrol</span>
          <select className={selectClass} value={learnerId} onChange={(e) => setLearnerId(e.target.value)}>
            {learners.map((l) => <option key={l.id} value={l.id}>{l.full_name}{enrolledIds.includes(l.id) ? " (enrolled)" : ""}</option>)}
          </select>
        </label>
      )}
      {alreadyEnrolled ? (
        <Button asChild variant="outline" className="w-full">
          <Link to={selected?.self ? "/student/courses" : "/parent/dashboard"}><CheckCircle2 /> Enrolled · go to course</Link>
        </Button>
      ) : (
        <Button variant="brand" className="w-full" disabled={busy || learnersLoading || (!free && !online)} onClick={() => void enroll()}>
          {busy ? <Loader2 className="animate-spin" /> : free ? "Enroll for free" : <><Lock /> Enroll now · {formatINR(price)}</>}
        </Button>
      )}
      {!free && !online && !alreadyEnrolled && <p className="text-xs text-muted-foreground">Online payment is being set up. Book a free trial or talk to an advisor to enrol today.</p>}
      {!free && online && !alreadyEnrolled && <p className="text-xs text-muted-foreground">Secure payment by Razorpay: UPI, cards and net banking.</p>}
    </div>
  );
}
