import { dashQuery } from "./dash.api";

export type AdminTrial = {
  id: string;
  parent_name: string;
  child_name: string;
  child_age?: number | null;
  email?: string | null;
  phone?: string | null;
  preferred_program?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  status: string;
  notes?: string | null;
  source?: string | null;
  createdAt?: string;
};

export const adminTrialsQuery = () =>
  dashQuery<AdminTrial[]>(["admin", "trials"], "/admin/trials");
