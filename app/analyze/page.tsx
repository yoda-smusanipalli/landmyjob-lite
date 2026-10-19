import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getJobs, getResumes } from "@/lib/data";
import { analyze, MAX_SCORE } from "@/lib/engine";
import { BandChip, ScoreMeter, bandStyle } from "@/components/ui";

export const dynamic = "force-dynamic";

/** "React", or for an either/or requirement "Go or Python" with the matched option in bold. */
function RequirementLabel({ options, matched }: { options: string[]; matched: string | null }) {
  if (options.length === 1) return <>{options[0]}</>;
  return (
    <>
      {options.map((o, i) => (
        <span key={o}>
          {i > 0 && " or "}
          <span className={o === matched ? "font-bold" : matched ? "opacity-60" : ""}>{o}</span>
        </span>
      ))}
    </>
  );
}

export default async function AnalyzePage({ searchParams }: { searchParams: { resume?: string; job?: string } }) {
  const { supabase } = await requireUser();
  const [resumes, jobs] = await Promise.all([getResumes(supabase), getJobs(supabase)]);
  const resume = resumes.find((r) => r.id === searchParams.resume) ?? resumes[0];
  const job = jobs.find((j) => j.id === searchParams.job) ?? jobs[0];

  if (!resume || !job) {
    return (
      <div className="card mx-auto max-w-lg text-center text-sm text-slate-600">
        You need at least one resume and one job to run an analysis.{" "}
        <Link href={resume ? "/jobs/new" : "/resumes/new"} className="text-brand hover:underline">
          Add {resume ? "a job" : "a resume"}
        </Link>
      </div>
    );
  }

  const result = analyze(resume.raw_text, job.raw_text, job.title);
  const style = bandStyle(result.band);

  return (
    <div className="space-y-6">
      {/* Switch resume or job without leaving the page. */}
      <form className="card flex flex-wrap items-end gap-3 p-4" action="/analyze">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="resume" className="label">Resume</label>
          <select id="resume" name="resume" defaultValue={resume.id} className="input">
            {resumes.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <div className="min-w-[200px] flex-1">
          <label htmlFor="job" className="label">Job</label>
          <select id="job" name="job" defaultValue={job.id} className="input">
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.company ? `, ${j.company}` : ""}</option>)}
          </select>
        </div>
        <button className="btn">Analyze</button>
        {resumes.length > 1 && <Link href={`/compare?job=${job.id}`} className="btn-ghost">Compare all resumes</Link>}
      </form>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="card h-fit">
          <p className="text-sm text-slate-500">{job.title}{job.company ? ` · ${job.company}` : ""}</p>
          <div className={`mt-2 text-5xl font-semibold tabular-nums ${style.text}`}>
            {result.score.toFixed(1)}
            <span className="text-xl font-normal text-slate-400"> / {MAX_SCORE}</span>
          </div>
          <div className="mt-3"><ScoreMeter score={result.score} band={result.band} size="lg" /></div>
          <div className="mt-3"><BandChip band={result.band} /></div>

          <dl className="mt-6 space-y-4">
            {result.components.map((c) => (
              <div key={c.key}>
                <div className="flex items-baseline justify-between text-sm">
                  <dt className="font-medium">{c.label} <span className="text-xs font-normal text-slate-400">{Math.round(c.weight * 100)}%</span></dt>
                  <dd className="tabular-nums">{c.score === null ? <span className="text-slate-400">n/a</span> : `${c.score.toFixed(1)} / ${MAX_SCORE}`}</dd>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className={`h-full ${style.fill}`} style={{ width: `${((c.score ?? 0) / MAX_SCORE) * 100}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{c.detail}</p>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-slate-400">Components marked n/a are left out and the rest are re-weighted.</p>
        </section>

        <div className="space-y-6">
          {result.tips.length > 0 && (
            <section className="card">
              <h2 className="font-semibold">What to change</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
                {result.tips.map((t) => <li key={t}>{t}</li>)}
              </ol>
            </section>
          )}

          <section className="card">
            <h2 className="font-semibold">Required</h2>
            {result.required.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No required skills were detected in this JD.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {result.required.map((r) => (
                  <li
                    key={r.options.join("|")}
                    className={`chip ${r.matched ? (r.evidence === "experience" ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-1 ring-amber-200") : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"}`}
                    title={r.matched ? (r.evidence === "experience" ? "Shown in an experience bullet" : "Only in your skills list") : "Not found on your resume"}
                  >
                    {r.matched ? "✓" : "✕"} <RequirementLabel options={r.options} matched={r.matched} />
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />In an experience bullet (full credit)</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />Skills list only (60% credit)</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />Missing</span>
            </div>
          </section>

          <section className="card">
            <h2 className="font-semibold">Nice to have</h2>
            {result.nice.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">This JD doesn&rsquo;t list any nice-to-haves.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {result.nice.map((n) => (
                  <li key={n.skill} className={`chip ${n.evidence ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500"}`}>
                    {n.evidence ? "✓" : "–"} {n.skill}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card text-sm text-slate-600">
            <h2 className="font-semibold text-ink">Experience read from your resume</h2>
            <p className="mt-2">
              {result.candidateYears === null ? "No dated roles found." : `About ${result.candidateYears} years of experience (overlapping roles counted once).`}
              {result.recentRole && <> Most recent role: <span className="font-medium text-ink">{result.recentRole}</span>.</>}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
