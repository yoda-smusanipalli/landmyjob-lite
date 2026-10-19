import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getJobs, getResumes } from "@/lib/data";
import { MAX_SCORE, rankResumes } from "@/lib/engine";
import { BandChip, ScoreBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ComparePage({ searchParams }: { searchParams: { job?: string } }) {
  const { supabase } = await requireUser();
  const [resumes, jobs] = await Promise.all([getResumes(supabase), getJobs(supabase)]);
  const job = jobs.find((j) => j.id === searchParams.job) ?? jobs[0];

  if (!job || resumes.length === 0) {
    return (
      <div className="card mx-auto max-w-lg text-center text-sm text-slate-600">
        Add at least one job and one resume to compare.{" "}
        <Link href="/" className="text-brand hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  const ranked = rankResumes(resumes, job.raw_text, job.title);
  const best = ranked[0];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Comparing {resumes.length} resume versions for</p>
        <h1 className="text-2xl font-semibold">{job.title}{job.company ? <span className="font-normal text-slate-500">, {job.company}</span> : null}</h1>
      </div>

      {ranked.length > 1 && (
        <p className="rounded-lg bg-brand-soft px-4 py-3 text-sm text-brand-dark">
          <strong>{best.resume.label}</strong> is your strongest version for this role
          {ranked[1].result.score < best.result.score
            ? `, ${(best.result.score - ranked[1].result.score).toFixed(1)} points ahead of the next.`
            : ", tied with the next."}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Resume</th>
              <th className="px-4 py-3">Overall</th>
              {best.result.components.map((c) => <th key={c.key} className="px-4 py-3">{c.label}</th>)}
              <th className="px-4 py-3">Missing</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ resume, result }) => {
              const missing = result.required.filter((r) => !r.matched).map((r) => r.options.join(" or "));
              return (
                <tr key={resume.id} className="border-t border-slate-100 align-top">
                  <td className="border-t border-slate-100 px-4 py-3">
                    <Link href={`/analyze?resume=${resume.id}&job=${job.id}`} className="font-medium hover:text-brand">{resume.label}</Link>
                    <div className="mt-1"><BandChip band={result.band} /></div>
                  </td>
                  <td className="border-t border-slate-100 px-4 py-3"><ScoreBadge score={result.score} band={result.band} /></td>
                  {result.components.map((c) => (
                    <td key={c.key} className="border-t border-slate-100 px-4 py-3 tabular-nums">
                      {c.score === null ? <span className="text-slate-400">n/a</span> : `${c.score.toFixed(1)} / ${MAX_SCORE}`}
                    </td>
                  ))}
                  <td className="border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
                    {missing.length === 0 ? <span className="text-emerald-700">None</span> : missing.join(", ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
