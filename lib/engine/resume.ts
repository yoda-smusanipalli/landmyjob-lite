import { findSkills } from "./skills";

export type Evidence = "experience" | "listed";

export interface ResumeProfile {
  /** Every detected skill and the strongest place it appears. */
  skills: Map<string, Evidence>;
  /** Total years of experience (overlapping roles merged), or null if no dates were found. */
  years: number | null;
  /** Skills mentioned in the most recent role, or null if roles couldn't be identified. */
  recentSkills: Set<string> | null;
  /** Label of the most recent role (its header line), for display. */
  recentRole: string | null;
}

type Section = "summary" | "skills" | "experience" | "other";

const SECTION_HEADERS: Array<{ re: RegExp; section: Section }> = [
  { re: /^(professional\s+|work\s+|relevant\s+)?(experience|employment|work history|career history)$/i, section: "experience" },
  { re: /^(projects|selected projects|key projects)$/i, section: "experience" },
  { re: /^(technical\s+)?(skills|core competencies|competencies|technologies|tech stack|toolkit)$/i, section: "skills" },
  { re: /^(summary|professional summary|profile|about|about me|objective)$/i, section: "summary" },
  { re: /^(education|certifications?|awards|publications|interests|languages|volunteering)$/i, section: "other" },
];

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

const DATE = String.raw`(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}/\d{4}|\d{4})`;
const RANGE_RE = new RegExp(`(${DATE})\\s*(?:-|–|—|to)\\s*(${DATE}|present|current|now|today)`, "gi");

/**
 * Converts a date token to a month index (year * 12 + month).
 * A bare year means January as a start date and December as an end date, so "2019 – 2021" is 3 years.
 */
export function parseDateToken(token: string, now: Date, isEnd = false): number | null {
  const t = token.trim().toLowerCase();
  if (/^(present|current|now|today)$/.test(t)) return now.getFullYear() * 12 + now.getMonth();
  let m = t.match(/^([a-z]+)\.?\s+(\d{4})$/);
  if (m) {
    const month = MONTHS[m[1].slice(0, 4)] ?? MONTHS[m[1].slice(0, 3)];
    return month === undefined ? null : Number(m[2]) * 12 + month;
  }
  m = t.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) {
    const month = Number(m[1]) - 1;
    return month >= 0 && month < 12 ? Number(m[2]) * 12 + month : null;
  }
  m = t.match(/^(\d{4})$/);
  if (!m) return null;
  const yearEnd = Number(m[1]) * 12 + (isEnd ? 11 : 0);
  // Don't project a bare end year into the future ("2026" read in October means "until now").
  return isEnd ? Math.min(yearEnd, now.getFullYear() * 12 + now.getMonth()) : yearEnd;
}

interface Role {
  start: number;
  end: number;
  lineIndex: number;
  header: string;
}

function headerSection(line: string): Section | null {
  const cleaned = line.trim().replace(/[:\s]+$/, "");
  if (cleaned.length === 0 || cleaned.length > 40) return null;
  for (const { re, section } of SECTION_HEADERS) if (re.test(cleaned)) return section;
  return null;
}

/** Merges overlapping [start, end) month intervals and returns the total months covered. */
export function mergedMonths(intervals: Array<[number, number]>): number {
  const sorted = intervals.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  let total = 0;
  let curStart = -Infinity;
  let curEnd = -Infinity;
  for (const [s, e] of sorted) {
    if (s > curEnd) {
      if (curEnd > curStart) total += curEnd - curStart;
      curStart = s;
      curEnd = e;
    } else {
      curEnd = Math.max(curEnd, e);
    }
  }
  if (curEnd > curStart) total += curEnd - curStart;
  return total;
}

export function parseResume(text: string, now: Date = new Date()): ResumeProfile {
  const lines = text.split(/\r?\n/);

  // Without any recognised headers, treat everything as experience.
  const sectionOf: Section[] = [];
  let current: Section = "summary";
  let sawHeader = false;
  for (const line of lines) {
    const header = headerSection(line);
    if (header) {
      current = header;
      sawHeader = true;
    }
    sectionOf.push(current);
  }
  if (!sawHeader) sectionOf.fill("experience");

  const skills = new Map<string, Evidence>();
  const experienceText = lines.filter((_, i) => sectionOf[i] === "experience").join("\n");
  const otherText = lines.filter((_, i) => sectionOf[i] !== "experience").join("\n");
  for (const hit of findSkills(experienceText)) skills.set(hit.skill, "experience");
  for (const hit of findSkills(otherText)) if (!skills.has(hit.skill)) skills.set(hit.skill, "listed");

  const roles: Role[] = [];
  lines.forEach((line, i) => {
    if (sectionOf[i] !== "experience") return;
    RANGE_RE.lastIndex = 0;
    const m = RANGE_RE.exec(line);
    if (!m) return;
    const start = parseDateToken(m[1], now);
    const end = parseDateToken(m[2], now, true);
    if (start === null || end === null || end < start) return;
    // If the date sits on its own line, the role title is the line above it.
    const rest = line.replace(m[0], "").replace(/[|,()\s-]/g, "");
    const usePrev = rest.length < 3 && i > 0 && lines[i - 1].trim() !== "" && sectionOf[i - 1] === "experience";
    const lineIndex = usePrev ? i - 1 : i;
    roles.push({ start, end, lineIndex, header: lines[lineIndex].trim() });
  });

  let years: number | null = null;
  if (roles.length > 0) {
    // End months are inclusive: "Jan 2018 – Dec 2021" is 48 months.
    years = Math.round((mergedMonths(roles.map((r) => [r.start, r.end + 1])) / 12) * 10) / 10;
  } else {
    const claim = text.match(/(\d{1,2})\+?\s+years/i);
    if (claim) years = Number(claim[1]);
  }

  // Most recent role = latest end date; its text runs until the next role starts.
  let recentSkills: Set<string> | null = null;
  let recentRole: string | null = null;
  if (roles.length > 0) {
    const ordered = [...roles].sort((a, b) => a.lineIndex - b.lineIndex);
    const latest = ordered.reduce((best, r) => (r.end > best.end || (r.end === best.end && r.start > best.start) ? r : best));
    const next = ordered.find((r) => r.lineIndex > latest.lineIndex);
    let stop = next ? next.lineIndex : lines.length;
    for (let i = latest.lineIndex; i < stop; i++) {
      if (sectionOf[i] !== "experience") {
        stop = i;
        break;
      }
    }
    const chunk = lines.slice(latest.lineIndex, stop).join("\n");
    recentSkills = new Set(findSkills(chunk).map((h) => h.skill));
    recentRole = latest.header;
  }

  return { skills, years, recentSkills, recentRole };
}
