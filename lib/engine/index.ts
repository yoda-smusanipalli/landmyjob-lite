import { parseJob } from "./job";
import { parseResume } from "./resume";
import { scoreFit, type FitResult } from "./score";

export { parseJob } from "./job";
export { parseResume } from "./resume";
export { scoreFit, bandFor } from "./score";
export type { FitResult, ComponentScore, RequirementResult } from "./score";
export type { JobProfile } from "./job";
export type { ResumeProfile } from "./resume";
export { MAX_SCORE, WEIGHTS, BANDS } from "./constants";

/** One-call analysis from raw text. */
export function analyze(resumeText: string, jobText: string, jobTitle = "", now: Date = new Date()): FitResult {
  return scoreFit(parseResume(resumeText, now), parseJob(jobText, jobTitle));
}

/** Scores one resume against many jobs, best fit first. */
export function rankJobs<J extends { raw_text: string; title: string }>(resumeText: string, jobs: J[], now: Date = new Date()) {
  const resume = parseResume(resumeText, now);
  return jobs
    .map((job) => ({ job, result: scoreFit(resume, parseJob(job.raw_text, job.title)) }))
    .sort((a, b) => b.result.score - a.result.score);
}

/** Scores many resumes against one job, best fit first. */
export function rankResumes<R extends { raw_text: string }>(resumes: R[], jobText: string, jobTitle = "", now: Date = new Date()) {
  const job = parseJob(jobText, jobTitle);
  return resumes
    .map((resume) => ({ resume, result: scoreFit(parseResume(resume.raw_text, now), job) }))
    .sort((a, b) => b.result.score - a.result.score);
}
