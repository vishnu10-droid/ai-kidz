import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { RazorpayStart } from "./orders.functions";

export type CoursePurchaseStart =
  | { enrolled: true; razorpay: null }
  | { enrolled: false; razorpay: RazorpayStart & { description: string } };

/**
 * Start buying a course for one of the caller's learners (their own student record, or a child
 * linked to their parent account). Free courses enrol straight away; paid ones open Razorpay and
 * enrol only after verifyCoursePayment confirms the signature.
 */
export const startCoursePurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ courseId: z.string().uuid(), studentId: z.string().uuid().optional() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<CoursePurchaseStart> => {
    const { supabase, userId } = context;

    const { data: course } = await supabase
      .from("courses")
      .select("id, title, price, is_published")
      .eq("id", data.courseId)
      .maybeSingle();
    if (!course || !course.is_published) throw new Error("This course isn't open for enrolment.");

    // Only learners the caller owns: their own student profile or their children.
    const { data: mine } = await supabase.rpc("my_student_ids");
    const myIds = new Set<string>(mine ?? []);
    let studentId = data.studentId;
    if (!studentId) {
      const { data: self } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      studentId = self?.id;
    }
    if (!studentId || !myIds.has(studentId)) throw new Error("Choose which learner to enrol.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("student_id", studentId)
      .eq("course_id", course.id)
      .maybeSingle();
    if (existing) throw new Error("Already enrolled in this course.");

    const price = Number(course.price);
    if (price <= 0) {
      const { error } = await supabaseAdmin
        .from("enrollments")
        .insert({ student_id: studentId, course_id: course.id });
      if (error) throw new Error("We couldn't enrol you. Please try again.");
      return { enrolled: true, razorpay: null };
    }

    const { createRazorpayOrder, razorpayKeys } = await import("./razorpay.server");
    if (!razorpayKeys())
      throw new Error("Online payment isn't available yet. Please talk to an advisor to enrol.");
    const receipt = `CRS-${Date.now().toString(36)}`;
    const rp = await createRazorpayOrder(price, receipt);
    const { error } = await supabaseAdmin.from("payments").insert({
      user_id: userId,
      student_id: studentId,
      course_id: course.id,
      purpose: "course",
      amount: price,
      provider: "razorpay",
      provider_order_id: rp.id,
      status: "pending",
      description: `Course: ${course.title}`,
    });
    if (error) {
      console.error(error);
      throw new Error("We couldn't start the payment. Please try again.");
    }
    return {
      enrolled: false,
      razorpay: {
        orderId: rp.id,
        amount: rp.amount,
        currency: rp.currency,
        keyId: rp.keyId,
        description: course.title,
      },
    };
  });

/** Confirms a Razorpay course payment and creates the enrolment. */
export const verifyCoursePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        razorpayOrderId: z.string().min(5).max(64),
        razorpayPaymentId: z.string().min(5).max(64),
        razorpaySignature: z.string().min(10).max(256),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, user_id, student_id, course_id, status, purpose, description")
      .eq("provider_order_id", data.razorpayOrderId)
      .maybeSingle();
    if (
      !payment ||
      payment.user_id !== context.userId ||
      payment.purpose !== "course" ||
      !payment.student_id ||
      !payment.course_id
    )
      throw new Error("Payment not found.");

    if (payment.status !== "paid") {
      const { verifyRazorpaySignature } = await import("./razorpay.server");
      if (
        !(await verifyRazorpaySignature(
          data.razorpayOrderId,
          data.razorpayPaymentId,
          data.razorpaySignature,
        ))
      ) {
        throw new Error(
          "We couldn't confirm this payment. If money was deducted, contact support with your payment details.",
        );
      }
      await supabaseAdmin
        .from("payments")
        .update({
          status: "paid",
          provider_payment_id: data.razorpayPaymentId,
          paid_at: new Date().toISOString(),
          method: "razorpay",
        })
        .eq("id", payment.id);
    }

    const { error } = await supabaseAdmin
      .from("enrollments")
      .upsert(
        { student_id: payment.student_id, course_id: payment.course_id },
        { onConflict: "student_id,course_id", ignoreDuplicates: true },
      );
    if (error) console.error("enrolment after payment failed", error);
    const { data: learner } = await supabaseAdmin
      .from("students")
      .select("user_id")
      .eq("id", payment.student_id)
      .maybeSingle();
    const link = learner?.user_id === context.userId ? "/student/courses" : "/parent/dashboard";
    await supabaseAdmin
      .from("notifications")
      .insert({
        user_id: context.userId,
        title: "Enrolment confirmed",
        body: payment.description ?? "Your course is ready.",
        link,
      });
    return { ok: true };
  });
