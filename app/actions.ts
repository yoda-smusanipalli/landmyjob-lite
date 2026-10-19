"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { fileToText, normalize } from "@/lib/parse";
import { SAMPLE_JOBS, SAMPLE_RESUMES } from "@/lib/sample-data";
import { STAGES, type Stage } from "@/lib/stages";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

/** Text from the uploaded file if one was chosen, otherwise from the paste box. */
async function textFromForm(formData: FormData, path: string): Promise<string> {
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    try {
      return await fileToText(file);
    } catch (e) {
      fail(path, e instanceof Error ? e.message : "Couldn't read that file.");
    }
  }
  const pasted = normalize(String(formData.get("text") ?? ""));
  if (pasted.length < 20) fail(path, "Upload a file or paste at least a few lines of text.");
  return pasted;
}

function field(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? "").trim().slice(0, max);
}

export async function createResume(formData: FormData) {
  const { supabase } = await requireUser();
  const path = "/resumes/new";
  const label = field(formData, "label", 120);
  if (!label) fail(path, "Give this resume version a name.");
  const raw_text = await textFromForm(formData, path);

  const { data, error } = await supabase.from("resumes").insert({ label, raw_text }).select("id").single();
  if (error) fail(path, error.message);
  revalidatePath("/");
  redirect(`/?resume=${data.id}`);
}

export async function createJob(formData: FormData) {
  const { supabase } = await requireUser();
  const path = "/jobs/new";
  const title = field(formData, "title", 160);
  const company = field(formData, "company", 160);
  if (!title) fail(path, "Add the job title.");
  const raw_text = await textFromForm(formData, path);

  const { data, error } = await supabase.from("jobs").insert({ title, company, raw_text }).select("id").single();
  if (error) fail(path, error.message);
  revalidatePath("/");

  // Jump straight to the analysis against the newest resume, if there is one.
  const { data: latest } = await supabase.from("resumes").select("id").order("created_at", { ascending: false }).limit(1);
  redirect(latest && latest.length > 0 ? `/analyze?job=${data.id}&resume=${latest[0].id}` : "/");
}

export async function deleteResume(formData: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("resumes").delete().eq("id", String(formData.get("id")));
  revalidatePath("/");
  redirect("/");
}

export async function deleteJob(formData: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("jobs").delete().eq("id", String(formData.get("id")));
  revalidatePath("/");
  redirect("/");
}

export async function updateStage(jobId: string, stage: string) {
  if (!STAGES.includes(stage as Stage)) return;
  const { supabase } = await requireUser();
  await supabase.from("jobs").update({ stage }).eq("id", jobId);
  revalidatePath("/");
}

export async function loadSampleData() {
  const { supabase } = await requireUser();
  const [{ count: resumeCount }, { count: jobCount }] = await Promise.all([
    supabase.from("resumes").select("id", { count: "exact", head: true }),
    supabase.from("jobs").select("id", { count: "exact", head: true }),
  ]);
  // Only into an empty account, so it can't duplicate.
  if ((resumeCount ?? 0) > 0 || (jobCount ?? 0) > 0) redirect("/");

  const { error: rErr } = await supabase.from("resumes").insert(SAMPLE_RESUMES);
  const { error: jErr } = await supabase.from("jobs").insert(SAMPLE_JOBS);
  if (rErr || jErr) fail("/", (rErr ?? jErr)!.message);
  revalidatePath("/");
  redirect("/");
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/login");
}
