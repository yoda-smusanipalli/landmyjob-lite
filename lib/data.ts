import type { SupabaseClient } from "@supabase/supabase-js";
import type { Stage } from "./stages";

export interface ResumeRow {
  id: string;
  label: string;
  raw_text: string;
  created_at: string;
}

export interface JobRow {
  id: string;
  title: string;
  company: string;
  raw_text: string;
  stage: Stage;
  created_at: string;
}

export async function getResumes(supabase: SupabaseClient): Promise<ResumeRow[]> {
  const { data, error } = await supabase
    .from("resumes")
    .select("id, label, raw_text, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getJobs(supabase: SupabaseClient): Promise<JobRow[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, company, raw_text, stage, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as JobRow[];
}
