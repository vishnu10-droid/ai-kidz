import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const teacherLoginInput = z.object({
  teacherId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(8, "Password needs at least 8 characters").max(72),
});

export type TeacherLoginResult = { status: "created" } | { status: "linked_existing" };

/**
 * Gives a teacher record a sign-in: the school/centre that runs the record sets the email and password.
 * If that email already has an account we link it instead and leave its password unchanged.
 */
export const createTeacherLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => teacherLoginInput.parse(d))
  .handler(async ({ data, context }): Promise<TeacherLoginResult> => {
    const { supabase } = context;

    // Read through the caller's own access rules: only the school/centre running this teacher passes.
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id, full_name, school_id, franchise_id, user_id")
      .eq("id", data.teacherId)
      .maybeSingle();
    if (!teacher) throw new Error("Teacher not found.");
    const { data: canManage } = await supabase.rpc("can_manage_org", {
      _school: teacher.school_id as string,
      _franchise: teacher.franchise_id as string,
    });
    if (!canManage) throw new Error("Only this teacher's school or centre can set their login.");
    if (teacher.user_id) throw new Error("This teacher already has a login.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();
    let userId = existing?.id;
    let status: TeacherLoginResult["status"] = "linked_existing";

    if (userId) {
      const { data: other } = await supabaseAdmin
        .from("teachers")
        .select("id")
        .eq("user_id", userId)
        .neq("id", teacher.id)
        .maybeSingle();
      if (other) throw new Error("This email is already a teacher at another school or centre.");
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: teacher.full_name },
        app_metadata: { staff_account: "teacher" },
      });
      if (error || !created.user) {
        console.error("createTeacherLogin", error);
        if (/password/i.test(error?.message ?? ""))
          throw new Error("Please choose a stronger password.");
        throw new Error("We couldn't create that login. Please try again.");
      }
      userId = created.user.id;
      status = "created";
      // Sign-up setup may still have made this brand-new account a student; a staff login is a teacher only.
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "student");
      await supabaseAdmin.from("students").delete().eq("user_id", userId);
    }

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: userId, role: "teacher" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    const { error: linkErr } = await supabaseAdmin
      .from("teachers")
      .update({ user_id: userId, email: data.email })
      .eq("id", teacher.id);
    if (roleErr || linkErr) {
      console.error("createTeacherLogin link", roleErr, linkErr);
      throw new Error(
        "The login was made but we couldn't connect it to this teacher. Please try again.",
      );
    }
    return { status };
  });

/** Readable random password for handing to a teacher, e.g. "Kite-7342-Robo". */
export function suggestTeacherPassword() {
  const words = [
    "Robo",
    "Kite",
    "Volt",
    "Gear",
    "Byte",
    "Nova",
    "Spark",
    "Orbit",
    "Pixel",
    "Laser",
  ];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  const digits = String(1000 + Math.floor(Math.random() * 9000));
  return `${pick()}-${digits}-${pick()}`;
}
