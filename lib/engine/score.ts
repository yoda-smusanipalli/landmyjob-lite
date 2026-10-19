import { BANDS, EVIDENCE, MAX_SCORE, RECENCY_TIP_THRESHOLD, SENIORITY_STEPS, WEIGHTS, type BandLabel } from "./constants";
import type { JobProfile } from "./job";
import type { Evidence, ResumeProfile } from "./resume";

export type ComponentKey = keyof typeof WEIGHTS;

export interface ComponentScore {
  key: ComponentKey;
  label: string;
  weight: number;
  /** 0–5, or null when the component doesn't apply (e.g. the JD lists no nice-to-haves). */
  score: number | null;
  detail: string;
}

export interface RequirementResult {
  /** One skill, or several for an either/or requirement. */
  options: string[];
  matched: string | null;
  evidence: Evidence | null;
}

export interface FitResult {
  score: number;
  band: BandLabel;
  components: ComponentScore[];
  required: RequirementResult[];
  nice: Array<{ skill: string; evidence: Evidence | null }>;
  candidateYears: number | null;
  seniority: "match" | "under" | "over" | "unknown" | "unstated";
  recentRole: string | null;
  tips: string[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number) => Math.min(MAX_SCORE, Math.max(0, n));

export function bandFor(score: number): BandLabel {
  return (BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1]).label;
}

function evidenceWeight(e: Evidence | null): number {
  return e === null ? 0 : EVIDENCE[e];
}

function bestMatch(options: string[], resume: ResumeProfile): RequirementResult {
  let best: RequirementResult = { options, matched: null, evidence: null };
  for (const skill of options) {
    const e = resume.skills.get(skill) ?? null;
    if (evidenceWeight(e) > evidenceWeight(best.evidence)) best = { options, matched: skill, evidence: e };
  }
  return best;
}

function seniorityScore(years: number | null, job: JobProfile) {
  if (job.minYears === null && job.maxYears === null) {
    return { score: MAX_SCORE, status: "unstated" as const, gap: 0 };
  }
  if (years === null) return { score: 0, status: "unknown" as const, gap: 0 };
  const min = job.minYears ?? 0;
  const max = job.maxYears ?? Infinity;
  const gap = years < min ? min - years : years > max ? years - max : 0;
  const status = years < min ? ("under" as const) : years > max ? ("over" as const) : ("match" as const);
  const step = SENIORITY_STEPS.find((s) => gap <= s.maxGap);
  return { score: step ? step.score : 0, status, gap };
}

const formatOptions = (options: string[]) => options.join(" or ");

export function scoreFit(resume: ResumeProfile, job: JobProfile): FitResult {
  const required = job.required.map((options) => bestMatch(options, resume));
  const nice = job.nice.map((skill) => ({ skill, evidence: resume.skills.get(skill) ?? null }));

  // Required: evidence-weighted coverage of required groups.
  const requiredScore =
    required.length === 0
      ? null
      : (MAX_SCORE * required.reduce((sum, r) => sum + evidenceWeight(r.evidence), 0)) / required.length;
  const requiredMatched = required.filter((r) => r.matched).length;

  // Nice-to-have: plain coverage.
  const niceMatched = nice.filter((n) => n.evidence).length;
  const niceScore = nice.length === 0 ? null : (MAX_SCORE * niceMatched) / nice.length;

  // Seniority.
  const sen = seniorityScore(resume.years, job);

  // Recency: share of matched skills that show up in the most recent role.
  const matchedSkills = [
    ...required.map((r) => r.matched).filter((s): s is string => s !== null),
    ...nice.filter((n) => n.evidence).map((n) => n.skill),
  ];
  let recencyScore: number | null = null;
  let recentShare = 0;
  if (resume.recentSkills !== null) {
    recentShare = matchedSkills.length === 0 ? 0 : matchedSkills.filter((s) => resume.recentSkills!.has(s)).length / matchedSkills.length;
    recencyScore = MAX_SCORE * recentShare;
  }

  const rangeText =
    job.minYears === null && job.maxYears === null
      ? "No experience requirement stated"
      : job.maxYears === null
        ? `JD asks for ${job.minYears}+ years`
        : `JD asks for ${job.minYears ?? 0}–${job.maxYears} years`;

  const components: ComponentScore[] = [
    {
      key: "required",
      label: "Required skills",
      weight: WEIGHTS.required,
      score: requiredScore === null ? null : round1(clamp(requiredScore)),
      detail: required.length === 0 ? "No required skills detected in the JD" : `${requiredMatched} of ${required.length} requirements matched`,
    },
    {
      key: "nice",
      label: "Nice-to-have skills",
      weight: WEIGHTS.nice,
      score: niceScore === null ? null : round1(clamp(niceScore)),
      detail: nice.length === 0 ? "No nice-to-haves listed" : `${niceMatched} of ${nice.length} matched`,
    },
    {
      key: "seniority",
      label: "Seniority",
      weight: WEIGHTS.seniority,
      score: sen.score,
      detail:
        resume.years === null
          ? `${rangeText}; no dated experience found on the resume`
          : `${rangeText}; resume shows about ${resume.years} years`,
    },
    {
      key: "recency",
      label: "Recency",
      weight: WEIGHTS.recency,
      score: recencyScore === null ? null : round1(clamp(recencyScore)),
      detail:
        recencyScore === null
          ? "Couldn't identify roles with dates"
          : `${Math.round(recentShare * 100)}% of matched skills used in your most recent role`,
    },
  ];

  // Weighted average over the components that apply.
  const applicable = components.filter((c) => c.score !== null);
  const totalWeight = applicable.reduce((s, c) => s + c.weight, 0);
  const raw = totalWeight === 0 ? 0 : applicable.reduce((s, c) => s + c.weight * (c.score as number), 0) / totalWeight;
  const score = round1(clamp(raw));

  return {
    score,
    band: bandFor(score),
    components,
    required,
    nice,
    candidateYears: resume.years,
    seniority: sen.status,
    recentRole: resume.recentRole,
    tips: buildTips({ required, nice, sen, resumeYears: resume.years, job, recencyScore, recentShare }),
  };
}

function buildTips(args: {
  required: RequirementResult[];
  nice: Array<{ skill: string; evidence: Evidence | null }>;
  sen: ReturnType<typeof seniorityScore>;
  resumeYears: number | null;
  job: JobProfile;
  recencyScore: number | null;
  recentShare: number;
}): string[] {
  const tips: string[] = [];
  const missing = args.required.filter((r) => !r.matched);
  if (missing.length > 0) {
    const list = missing.slice(0, 3).map((r) => formatOptions(r.options)).join(", ");
    tips.push(`Missing required: ${list}. If you have this experience, add a bullet that shows where you used it.`);
  }

  const listedOnly = args.required.filter((r) => r.evidence === "listed").map((r) => r.matched as string);
  if (listedOnly.length > 0) {
    tips.push(
      `${listedOnly.slice(0, 3).join(", ")} ${listedOnly.length === 1 ? "is" : "are"} only in your skills list. Back ${listedOnly.length === 1 ? "it" : "them"} with an experience bullet to strengthen the match.`,
    );
  }

  if (args.sen.status === "over") {
    tips.push(
      `This role targets ${args.job.minYears ?? 0}–${args.job.maxYears} years and you show about ${args.resumeYears}. You may read as overqualified; consider a more senior version of this role.`,
    );
  } else if (args.sen.status === "under") {
    tips.push(
      `This role asks for ${args.job.minYears}+ years and you show about ${args.resumeYears}. Lead with your highest-scope work to close the gap.`,
    );
  } else if (args.sen.status === "unknown") {
    tips.push("Add dates to each role (e.g. \"Mar 2022 – Present\") so your experience can be measured.");
  }

  if (args.recencyScore !== null && args.recentShare < RECENCY_TIP_THRESHOLD && args.required.some((r) => r.matched)) {
    tips.push("Most of your matching skills come from older roles. If you use them in your current role, say so.");
  }

  const missingNice = args.nice.filter((n) => !n.evidence).map((n) => n.skill);
  if (missingNice.length > 0) {
    tips.push(`Nice-to-haves you don't show yet: ${missingNice.slice(0, 4).join(", ")}.`);
  }
  return tips;
}
