import { findSkills } from "./skills";

export interface JobProfile {
  /**
   * Required skills as groups. A group with more than one skill is an either/or requirement
   * ("Go or Python") and is satisfied by any one of them.
   */
  required: string[][];
  nice: string[];
  minYears: number | null;
  maxYears: number | null;
}

type JdSection = "intro" | "required" | "nice";

const REQUIRED_HEADING =
  /^(requirements|qualifications|minimum qualifications|basic qualifications|required qualifications|required skills|must[- ]haves?|what you('|’)ll need|what you bring|you have|who you are)\b/i;
const NICE_HEADING =
  /^(nice[- ]to[- ]haves?|preferred( qualifications| skills)?|bonus( points)?|pluses|it'?s a plus|good to have)\b/i;

/** Splits a JD into lines tagged by section. Text after "Requirements:" on the same line stays in that section. */
function sectionLines(text: string): Array<{ section: JdSection; text: string }> {
  const out: Array<{ section: JdSection; text: string }> = [];
  let current: JdSection = "intro";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const isBullet = /^[-*•·]/.test(line);
    if (!isBullet && line.length < 80) {
      if (NICE_HEADING.test(line)) {
        current = "nice";
        out.push({ section: current, text: line.replace(NICE_HEADING, "").replace(/^\s*:/, "") });
        continue;
      }
      if (REQUIRED_HEADING.test(line)) {
        current = "required";
        out.push({ section: current, text: line.replace(REQUIRED_HEADING, "").replace(/^\s*:/, "") });
        continue;
      }
    }
    out.push({ section: current, text: line });
  }
  return out;
}

const OR_GAP = /^\s*(,?\s*(and\/)?or|\/)\s*$/i;
const COMMA_GAP = /^\s*,\s*$/;

/**
 * Groups the skills in one line into requirements.
 * A run of neighbouring skills joined by commas, "or", "and/or" or "/" becomes one either/or group
 * if any joiner in the run is an "or" ("React, Vue, or Angular"). Without an "or", each skill
 * stands alone ("TypeScript, React").
 */
export function groupLine(line: string): string[][] {
  const all = findSkills(line);
  // Drop a hit that sits inside a longer one ("CSS" inside "Tailwind CSS", "AWS" inside "AWS Lambda").
  const hits = all.filter(
    (h) => !all.some((o) => o !== h && o.index <= h.index && o.end >= h.end && o.end - o.index > h.end - h.index),
  );

  const runs: Array<{ skills: string[]; hasOr: boolean }> = [];
  hits.forEach((hit, i) => {
    const prev = hits[i - 1];
    const gap = prev && hit.index >= prev.end ? line.slice(prev.end, hit.index) : null;
    const joinsOr = gap !== null && OR_GAP.test(gap);
    const joinsComma = gap !== null && COMMA_GAP.test(gap);
    if (prev && (joinsOr || joinsComma)) {
      const run = runs[runs.length - 1];
      run.skills.push(hit.skill);
      run.hasOr ||= joinsOr;
    } else {
      runs.push({ skills: [hit.skill], hasOr: false });
    }
  });

  return runs.flatMap((run) => {
    const unique = [...new Set(run.skills)];
    return run.hasOr ? [unique] : unique.map((s) => [s]);
  });
}

const YEARS_RE = /\b(\d{1,2})\s*(?:(?:-|–|to)\s*(\d{1,2}))?\s*\+?\s*(?:years?|yrs?)\b/i;

function titleHint(title: string): { min: number | null; max: number | null } {
  const t = title.toLowerCase();
  if (/\b(intern|junior|jr\.?|entry[- ]level|graduate|new grad)\b/.test(t) || /\b(i|1)\s*$/i.test(title.trim()))
    return { min: 0, max: 2 };
  if (/\b(staff|principal|distinguished)\b/.test(t)) return { min: 10, max: null };
  if (/\b(director|head of|vp)\b/.test(t)) return { min: 10, max: null };
  if (/\b(manager|lead)\b/.test(t)) return { min: 7, max: null };
  if (/\b(senior|sr\.?)\b/.test(t)) return { min: 5, max: null };
  return { min: null, max: null };
}

export function parseJob(text: string, title = ""): JobProfile {
  const lines = sectionLines(text);
  const hasRequiredSection = lines.some((l) => l.section === "required");

  // Without a "Requirements" heading, everything outside "Nice to have" counts as required.
  const requiredLines = lines.filter((l) => (hasRequiredSection ? l.section === "required" : l.section !== "nice"));
  const niceLines = lines.filter((l) => l.section === "nice");

  const required: string[][] = [];
  const seen = new Set<string>();
  for (const line of requiredLines) {
    for (const group of groupLine(line.text)) {
      // If any option is already required, this group is already satisfied by that requirement.
      // (Filtering it down instead would turn "Go or Python" into a hard "Go".)
      if (group.some((s) => seen.has(s))) continue;
      required.push(group);
      group.forEach((s) => seen.add(s));
    }
  }

  const nice = [...new Set(niceLines.flatMap((l) => findSkills(l.text).map((h) => h.skill)))].filter((s) => !seen.has(s));

  const yearsMatch = requiredLines.map((l) => l.text).join("\n").match(YEARS_RE) ?? text.match(YEARS_RE);
  const hint = titleHint(title);
  let minYears: number | null = hint.min;
  let maxYears: number | null = hint.max;
  if (yearsMatch) {
    minYears = Number(yearsMatch[1]);
    maxYears = yearsMatch[2] !== undefined ? Number(yearsMatch[2]) : hint.max !== null ? minYears + 3 : null;
  }

  return { required, nice, minYears, maxYears };
}
