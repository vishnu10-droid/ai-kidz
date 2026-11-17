import { describe, expect, it } from "vitest";
import { isOrgSignupRole, sanitizeSignupRole } from "@/lib/roles";
import { registerSchema } from "@/lib/schemas";

const base = { full_name: "Asha Rao", email: "asha@school.in", phone: "9876543210", password: "longpassword", confirm: "longpassword" };

describe("public sign-up roles", () => {
  it("allows School Admin and Franchise Partner sign-up", () => {
    expect(sanitizeSignupRole("school_admin")).toBe("school_admin");
    expect(sanitizeSignupRole("franchise")).toBe("franchise");
  });

  it("never lets sign-up create an admin or teacher", () => {
    expect(sanitizeSignupRole("admin")).toBe("student");
    expect(sanitizeSignupRole("teacher")).toBe("student");
  });

  it("treats only schools and franchises as organisation sign-ups", () => {
    expect(isOrgSignupRole("school_admin")).toBe(true);
    expect(isOrgSignupRole("franchise")).toBe(true);
    expect(isOrgSignupRole("parent")).toBe(false);
  });

  it("requires a school name, city and state for School Admin sign-up", () => {
    const res = registerSchema.safeParse({ ...base, role: "school_admin" });
    expect(res.success).toBe(false);
    const paths = res.success ? [] : res.error.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["org_name", "city", "state"]));
  });

  it("accepts a complete Franchise Partner sign-up", () => {
    expect(registerSchema.safeParse({ ...base, role: "franchise", org_name: "AIKIDZ Pune", city: "Pune", state: "Maharashtra" }).success).toBe(true);
  });

  it("does not ask students for organisation details", () => {
    expect(registerSchema.safeParse({ ...base, role: "student", phone: "" }).success).toBe(true);
  });
});
