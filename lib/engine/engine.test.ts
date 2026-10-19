import { describe, expect, it } from "vitest";
import { analyze, bandFor, parseJob, parseResume } from "./index";
import { mergedMonths, parseDateToken } from "./resume";
import { groupLine } from "./job";
import { findSkills } from "./skills";

const NOW = new Date("2026-10-18T12:00:00Z");

const RESUME = `JANE DOE
Senior Engineer

SUMMARY
Engineer who loves TypeScript.

SKILLS
TypeScript, React, GraphQL, Kubernetes

EXPERIENCE
Senior Engineer, Acme
Jan 2022 - Present
- Built the dashboard in React and TypeScript on AWS.

Engineer, Beta Corp
Jan 2018 - Dec 2021
- Wrote Python services with PostgreSQL.

EDUCATION
B.S. Computer Science, 2014 - 2018`;

describe("skill matching", () => {
  it("maps aliases to canonical skills", () => {
    const skills = findSkills("We run k8s and Postgres on AWS").map((h) => h.skill);
    expect(skills).toEqual(expect.arrayContaining(["Kubernetes", "PostgreSQL", "AWS"]));
  });

  it("does not match a short alias inside another token", () => {
    const skills = findSkills("Experience with Node.js and Next.js").map((h) => h.skill);
    expect(skills).toContain("Node.js");
    expect(skills).not.toContain("JavaScript"); // "js" inside "Node.js"
  });

  it("ignores everyday words that look like skills", () => {
    const skills = findSkills("For the rest of the year, stay safe and express yourself").map((h) => h.skill);
    expect(skills).toEqual([]);
  });
});

describe("job parsing", () => {
  it("splits required and nice-to-have sections", () => {
    const job = parseJob("About us: we use Figma.\n\nRequirements:\n- React\n- SQL\n\nNice to have:\n- GraphQL");
    expect(job.required).toEqual([["React"], ["SQL"]]);
    expect(job.nice).toEqual(["GraphQL"]);
  });

  it("treats 'X or Y' as one either/or requirement", () => {
    expect(groupLine("- Go or Python for tooling")).toEqual([["Go", "Python"]]);
    expect(groupLine("- CI/CD with Jenkins or GitHub Actions")).toEqual([["CI/CD"], ["Jenkins", "GitHub Actions"]]);
  });

  it("groups Oxford-comma and 'and/or' lists into one either/or requirement", () => {
    expect(groupLine("- Experience with React, Vue, or Angular")).toEqual([["React", "Vue", "Angular"]]);
    expect(groupLine("- Go and/or Rust")).toEqual([["Go", "Rust"]]);
    expect(groupLine("- TypeScript, React")).toEqual([["TypeScript"], ["React"]]); // no "or": both required
  });

  it("ignores a skill nested inside a longer skill name", () => {
    expect(groupLine("- Tailwind CSS or Bootstrap")).toEqual([["Tailwind CSS"]]);
    expect(groupLine("- AWS Lambda or Azure")).toEqual([["Lambda", "Azure"]]);
  });

  it("doesn't turn an alternative into a hard requirement when one option is already required", () => {
    const job = parseJob("Requirements:\n- 3+ years of Python\n- Go or Python");
    expect(job.required).toEqual([["Python"]]);
  });

  it("only reads 'years' as an experience requirement when it's a standalone number", () => {
    expect(parseJob("Requirements:\n- We serve 150 years of archives\n- React").minYears).toBeNull();
    expect(parseJob("Requirements:\n- 1+ year of Python").minYears).toBe(1);
  });

  it("reads explicit year ranges and open-ended minimums", () => {
    expect(parseJob("Requirements:\n- 0-2 years of experience").maxYears).toBe(2);
    const senior = parseJob("Requirements:\n- 5+ years building web apps");
    expect([senior.minYears, senior.maxYears]).toEqual([5, null]);
  });

  it("falls back to the title when no years are stated", () => {
    expect(parseJob("Requirements:\n- React", "Staff Engineer").minYears).toBe(10);
  });
});

describe("resume parsing", () => {
  it("parses common date formats", () => {
    expect(parseDateToken("Mar 2022", NOW)).toBe(2022 * 12 + 2);
    expect(parseDateToken("06/2019", NOW)).toBe(2019 * 12 + 5);
    expect(parseDateToken("Present", NOW)).toBe(2026 * 12 + 9);
  });

  it("treats a bare end year as December, so '2019 - 2021' is 3 years", () => {
    const r = parseResume("EXPERIENCE\nEngineer, Acme\n2019 - 2021\n- Built things", NOW);
    expect(r.years).toBe(3);
    expect(parseResume("EXPERIENCE\nEngineer, Acme\nJun 2021 - 2021\n- Built things", NOW).years).toBeCloseTo(0.6, 1);
  });

  it("merges overlapping roles instead of double-counting", () => {
    expect(mergedMonths([[0, 24], [12, 36]])).toBe(36);
    expect(mergedMonths([[0, 12], [24, 36]])).toBe(24);
  });

  it("separates experience evidence from skills-list mentions and ignores education dates", () => {
    const r = parseResume(RESUME, NOW);
    expect(r.skills.get("React")).toBe("experience");
    expect(r.skills.get("GraphQL")).toBe("listed");
    expect(r.years).toBeCloseTo(8.8, 1); // Jan 2018 → Oct 2026, education excluded
    expect(r.recentRole).toBe("Senior Engineer, Acme");
    expect(r.recentSkills?.has("Python")).toBe(false);
  });
});

describe("scoring", () => {
  it("gives a full match a 5", () => {
    const result = analyze(RESUME, "Requirements:\n- React\n- TypeScript\n- 5+ years", "", NOW);
    expect(result.score).toBe(5);
    expect(result.band).toBe("Strong fit");
  });

  it("weights skills-list-only matches below experience matches", () => {
    const experience = analyze(RESUME, "Requirements:\n- React", "", NOW).components[0].score;
    const listedOnly = analyze(RESUME, "Requirements:\n- GraphQL", "", NOW).components[0].score;
    expect(experience).toBe(5);
    expect(listedOnly).toBe(3);
  });

  it("satisfies an either/or requirement with either skill", () => {
    const result = analyze(RESUME, "Requirements:\n- Go or Python", "", NOW);
    expect(result.required[0].matched).toBe("Python");
  });

  it("penalises over-qualification for junior roles", () => {
    const result = analyze(RESUME, "Requirements:\n- 0-2 years\n- React", "Frontend Developer I", NOW);
    expect(result.seniority).toBe("over");
    expect(result.components.find((c) => c.key === "seniority")?.score).toBe(0);
    expect(result.tips.some((t) => t.includes("overqualified"))).toBe(true);
  });

  it("handles an empty resume without crashing", () => {
    const result = analyze("", "Requirements:\n- React\n- 3+ years", "", NOW);
    expect(result.score).toBe(0);
    expect(result.band).toBe("Weak fit");
  });

  it("drops components that don't apply and re-weights the rest", () => {
    // No nice-to-haves and no experience requirement: nice is n/a, seniority is neutral.
    const result = analyze(RESUME, "Requirements:\n- React", "", NOW);
    expect(result.components.find((c) => c.key === "nice")?.score).toBeNull();
    expect(result.score).toBeGreaterThan(4.5);
  });

  it("maps scores to bands at the boundaries", () => {
    expect(bandFor(4.5)).toBe("Strong fit");
    expect(bandFor(4.4)).toBe("Good fit");
    expect(bandFor(2.5)).toBe("Stretch");
    expect(bandFor(2.4)).toBe("Weak fit");
  });
});
