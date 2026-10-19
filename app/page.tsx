import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getJobs, getResumes } from "@/lib/data";
import { rankJobs } from "@/lib/engine";
import { STAGES, STAGE_LABELS } from "@/lib/stages";
import { Alert, BandChip, ScoreBadge } from "@/components/ui";
import { ConfirmDelete, StageSelect, SubmitButton } from "@/components/client";
import { deleteJob, deleteResume, loadSampleData } from "./actions";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: { resume?: string; error?: string } }) {
  const { supabase } = await requireUser();
  const [resumes, jobs] = await Promise.all([getResumes(supabase), getJobs(supabase)]);

  if (resumes.length === 0 && jobs.length === 0) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <Alert error={searchParams.error} />
        <h1 className="text-2xl font-semibold">Let&rsquo;s find your best-fit roles</h1>
        <p className="mt-2 text-slate-600">
          Add a resume and a job description to get your first fit score, or explore with sample data first.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/resumes/new" className="btn">Add your resume</Link>
          <form action={loadSampleData}>
            <SubmitButton pendingText="Loading…" className="btn-ghost">Load sample data</SubmitButton>
          </form>
        </div>
        <p className="mt-3 text-xs text-slate-400">Sample data: 2 versions of a fictional resume and 8 fictional job descriptions.</p>
      </div>
    );
  }

  const selected = resumes.find((r) => r.id === searchParams.resume) ?? resumes[0];
  const ranked = selected ? rankJobs(selected.raw_text, jobs) : [];
  const stageCounts = STAGES.map((s) => ({ stage: s, count: jobs.filter((j) => j.stage === s).length }));

  return (
    <div className="space-y-6">
      <Alert error={searchParams.error} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Your job search</h1>
          <p className="text-sm text-slate-600">
            {jobs.length} saved {jobs.length === 1 ? "job" : "jobs"} · {resumes.length} resume{" "}
            {resumes.length === 1 ? "version" : "versions"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {stageCounts.map(({ stage, count }) => (
            <span key={stage} className="chip bg-white text-slate-600 ring-1 ring-slate-200">
              {STAGE_LABELS[stage]} <span className="font-semibold text-ink">{count}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Resumes</h2>
            <Link href="/resumes/new" className="text-sm text-brand hover:underline">+ Add</Link>
          </div>
          {resumes.length === 0 && <p className="text-sm text-slate-500">Add a resume to rank your jobs.</p>}
          {resumes.map((r) => {
            const active = r.id === selected?.id;
            return (
              <div key={r.id} className={`card p-4 ${active ? "border-brand ring-2 ring-brand/20" : ""}`}>
                <Link href={`/?resume=${r.id}`} className="block font-medium hover:text-brand">{r.label}</Link>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  <ConfirmDelete action={deleteResume} id={r.id} what="resume" />
                </div>
              </div>
            );
          })}
        </aside>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {selected ? <>Best matches for &ldquo;{selected.label}&rdquo;</> : "Saved jobs"}
            </h2>
            <Link href="/jobs/new" className="text-sm text-brand hover:underline">+ Add job</Link>
          </div>

          {jobs.length === 0 && (
            <div className="card text-sm text-slate-600">
              No jobs yet. <Link href="/jobs/new" className="text-brand hover:underline">Add a job description</Link> to see how this resume scores.
            </div>
          )}

          {selected
            ? ranked.map(({ job, result }) => {
                const missing = result.required.filter((r) => !r.matched).length;
                return (
                  <article key={job.id} className="card flex flex-wrap items-center gap-4 p-4">
                    <ScoreBadge score={result.score} band={result.band} />
                    <div className="min-w-[200px] flex-1">
                      <Link href={`/analyze?resume=${selected.id}&job=${job.id}`} className="font-medium hover:text-brand">
                        {job.title}
                      </Link>
                      <div className="text-sm text-slate-500">{job.company || "Company not set"}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <BandChip band={result.band} />
                        <span>
                          {missing === 0 ? "All requirements met" : `${missing} requirement${missing === 1 ? "" : "s"} missing`}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <StageSelect jobId={job.id} stage={job.stage} />
                      <Link href={`/analyze?resume=${selected.id}&job=${job.id}`} className="text-sm text-brand hover:underline">Details</Link>
                      {resumes.length > 1 && (
                        <Link href={`/compare?job=${job.id}`} className="text-sm text-brand hover:underline">Compare resumes</Link>
                      )}
                      <ConfirmDelete action={deleteJob} id={job.id} what="job" />
                    </div>
                  </article>
                );
              })
            : jobs.map((job) => (
                <article key={job.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <div className="font-medium">{job.title}</div>
                    <div className="text-sm text-slate-500">{job.company}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StageSelect jobId={job.id} stage={job.stage} />
                    <ConfirmDelete action={deleteJob} id={job.id} what="job" />
                  </div>
                </article>
              ))}
        </section>
      </div>
    </div>
  );
}
