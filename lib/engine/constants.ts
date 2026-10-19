/** All scoring knobs live here so they can be tuned without touching the logic. */

export const MAX_SCORE = 5;

/** Component weights. They sum to 1; components that don't apply are dropped and the rest re-weighted. */
export const WEIGHTS = {
  required: 0.5,
  nice: 0.15,
  seniority: 0.2,
  recency: 0.15,
} as const;

/** How much a matched skill counts, depending on where the resume shows it. */
export const EVIDENCE = {
  experience: 1.0, // used in an experience bullet
  listed: 0.6, // only listed under Skills / Summary
} as const;

/** Seniority: years outside the JD's range → component score (0–5). */
export const SENIORITY_STEPS: ReadonlyArray<{ maxGap: number; score: number }> = [
  { maxGap: 0, score: 5 },
  { maxGap: 2, score: 3 },
  { maxGap: 5, score: 1 },
];

/** Rating bands, checked top to bottom. */
export const BANDS: ReadonlyArray<{ min: number; label: BandLabel }> = [
  { min: 4.5, label: "Strong fit" },
  { min: 3.5, label: "Good fit" },
  { min: 2.5, label: "Stretch" },
  { min: 0, label: "Weak fit" },
];

export type BandLabel = "Strong fit" | "Good fit" | "Stretch" | "Weak fit";

/** Recency below this share triggers a tip. */
export const RECENCY_TIP_THRESHOLD = 0.5;

/** Scores below this get a plan with alternatives (better resume version, better-fit jobs, projected score). */
export const LOW_SCORE_THRESHOLD = 3;

/** Another saved job is suggested as a better fit only at or above this score (the "Good fit" band). */
export const ALTERNATIVE_MIN_SCORE = 3.5;

/** At most this many better-fit jobs are suggested. */
export const MAX_ALTERNATIVE_JOBS = 3;
