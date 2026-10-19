import { ALTERNATIVE_MIN_SCORE, LOW_SCORE_THRESHOLD, MAX_ALTERNATIVE_JOBS } from "./constants";
import { parseJob } from "./job";
import { parseResume } from "./resume";
import { potentialFit, scoreFit, type FitResult } from "./score";

export interface SkillGap {
  /** The skill, or "Go or Python" for an unmatched either/or requirement. */
  label: string;
  /** True when the skill is on the resume but only in the skills list. */
  listedOnly: boolean;
}

/** Options shown when a resume scores below LOW_SCORE_THRESHOLD for a job. */
export interface LowScorePlan<R, J> {
  result: FitResult;
  /** Required skills not yet backed by an experience bullet: missing ones first. */
  gaps: SkillGap[];
  /** Score if every gap were backed by a bullet in the most recent role. */
  potential: FitResult;
  /** How the resume's years fall outside the role's range, when they do. */
  seniorityNote: string | null;
  /** Another resume version that scores at least LOW_SCORE_THRESHOLD for this job. */
  betterResume: { resume: R; result: FitResult } | null;
  /** Other saved jobs where this resume is at least a good fit, best first. */
  betterJobs: Array<{ job: J; result: FitResult }>;
}

/** Builds the plan, or returns null when the score isn't low enough to need one. */
export function lowScorePlan<R extends { id: string; raw_text: string }, J extends { id: string; raw_text: string; title: string }>(
  resume: R,
  job: J,
  resumes: R[],
  jobs: J[],
  now: Date = new Date(),
): LowScorePlan<R, J> | null {
  const resumeProfile = parseResume(resume.raw_text, now);
  const jobProfile = parseJob(job.raw_text, job.title);
  const result = scoreFit(resumeProfile, jobProfile);
  if (result.score >= LOW_SCORE_THRESHOLD) return null;

  const gaps: SkillGap[] = [
    ...result.required.filter((r) => !r.matched).map((r) => ({ label: r.options.join(" or "), listedOnly: false })),
    ...result.required.filter((r) => r.evidence === "listed").map((r) => ({ label: r.matched as string, listedOnly: true })),
  ];

  const potential = potentialFit(resumeProfile, jobProfile);
  const years = resumeProfile.years;
  let seniorityNote: string | null = null;
  if (result.seniority === "under") {
    seniorityNote = `The role asks for ${jobProfile.minYears}+ years and your resume shows about ${years}.`;
  } else if (result.seniority === "over") {
    seniorityNote = `The role targets ${jobProfile.minYears ?? 0}–${jobProfile.maxYears} years and your resume shows about ${years}.`;
  } else if (result.seniority === "unknown") {
    seniorityNote = "No dated roles were found, so your experience can't be measured. Add dates to each role.";
  }

  let betterResume: LowScorePlan<R, J>["betterResume"] = null;
  for (const other of resumes) {
    if (other.id === resume.id) continue;
    const otherResult = scoreFit(parseResume(other.raw_text, now), jobProfile);
    if (otherResult.score >= LOW_SCORE_THRESHOLD && otherResult.score > (betterResume?.result.score ?? 0)) {
      betterResume = { resume: other, result: otherResult };
    }
  }

  const betterJobs = jobs
    .filter((j) => j.id !== job.id)
    .map((j) => ({ job: j, result: scoreFit(resumeProfile, parseJob(j.raw_text, j.title)) }))
    .filter((j) => j.result.score >= ALTERNATIVE_MIN_SCORE)
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, MAX_ALTERNATIVE_JOBS);

  return { result, gaps, potential, seniorityNote, betterResume, betterJobs };
}
