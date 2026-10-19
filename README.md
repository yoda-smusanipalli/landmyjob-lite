# LandMyJob Lite: Resume-to-JD Fit Analyzer

> A 2-hour Casper take-home build. Upload your resume and a job description, and get an explainable fit score from 0 to 5 with concrete ways to close the gaps.

**Live demo:** https://landmyjob-lite-18f2.vercel.app

## Getting started

There are two ways to try the app.

### Option 1: Create your own account

1. Open the [login page](https://landmyjob-lite-18f2.vercel.app/login), enter any email and a password of at least 8 characters, and click **Sign up**. No email confirmation is needed.
2. Your dashboard starts empty. Click **Load sample data** to add 2 versions of a fictional resume and 8 fictional job descriptions for testing.
3. The dashboard now ranks every job for the selected resume. Open any job to see its fit score and analysis.

**Load sample data** only appears on an empty account. If you'd rather use your own data, click **Add your resume** instead and upload a PDF, DOCX or TXT file.

### Option 2: Sign in with the demo account

1. Open the [login page](https://landmyjob-lite-18f2.vercel.app/login).
2. Sign in with `demo@landmyjob.app` / `CasperDemo2026`.

The demo account already has the sample data loaded, so you can start exploring immediately.

---

## Why I care about this

The job hunt is broken for most people: dozens of applications, generic resumes, and no feedback on why you weren't a fit. I care about this enough that I built a full product around it.

**Original product: [landmyjob.app](https://landmyjob.app)**
LandMyJob finds matching jobs, tailors your resume and cover letter for each one, and fills in applications for your final review. Please try it to see the full vision this take-home comes from.

**This repository is a separate, fresh build.** It was written from an empty repo within the 2-hour timebox and shares no code with landmyjob.app. It focuses on one slice of that vision, fit analysis, using deterministic, explainable logic you can read end to end.



## Who it's for

Job seekers who want to know, **before they apply**, how well their resume matches a role and what to change.

## What works

- **Auth:** sign up, sign in, sign out (Supabase email/password); every page except login is protected
- **Resumes:** upload PDF / DOCX / TXT or paste text; save multiple named versions
- **Jobs:** upload or paste a JD; required and nice-to-have skills are extracted automatically
- **Analysis:** 0–5 fit score with a per-component breakdown, matched and missing skills, evidence strength and prioritized tips
- **Ranking:** the dashboard ranks every saved job for the selected resume
- **Compare:** all resume versions side by side against one job, with the strongest version called out
- **Pipeline:** move each job through Saved → Applied → Interviewing → Offer / Rejected
- **Sample data:** one click loads a fictional resume (2 versions) and 8 fictional JDs into an empty account
- **Delete** resumes and jobs (with confirmation)

## How the score works

All scoring lives in [`lib/engine/`](lib/engine): pure TypeScript with no framework imports, covered by unit tests. Weights and thresholds are in [`constants.ts`](lib/engine/constants.ts).

Every component is scored on the same 0–5 scale. The overall score is their weighted average, rounded to one decimal (e.g. **4.3 / 5**). A component that doesn't apply (e.g. a JD with no nice-to-haves) is shown as n/a and the others are re-weighted.

| Component | Weight | Scored 0–5 as |
|---|---|---|
| Required skills | 50% | 5 × evidence-weighted coverage: a skill used in an experience bullet earns full credit; one only in the Skills list earns 60% |
| Nice-to-have skills | 15% | 5 × (matched ÷ total) |
| Seniority | 20% | Years from resume date ranges vs. the JD's range. 5 = within range · 3 = within 2 years · 1 = within 5 years · 0 = further, or no dated roles. Penalizes **over**-qualification for capped roles (e.g. "0–2 years") |
| Recency | 15% | 5 × share of matched skills that appear in the most recent role |

**Bands:** 4.5+ Strong fit · 3.5–4.4 Good fit · 2.5–3.4 Stretch · below 2.5 Weak fit

**Details worth knowing:**
- Skills come from a curated dictionary of about 80 skills with aliases (`k8s` → Kubernetes, `Postgres` → PostgreSQL). Short aliases only match as whole tokens, so "js" in "Node.js" doesn't count as JavaScript.
- **Either/or requirements** ("Go or Python", "React, Vue, or Angular", "Go and/or Rust") count as one requirement, satisfied by any of the options.
- Experience years merge overlapping roles and ignore education dates.
- With no years stated in the JD, the title is used as a hint (Senior → 5+, Staff → 10+, "Developer I" → 0–2).

## Architecture

```
Next.js 14 (App Router, TypeScript, Server Components + Server Actions)
  ├── lib/engine        scoring: skills.ts · resume.ts · job.ts · score.ts   (pure, unit tested)
  ├── lib/extract-text  PDF (unpdf) / DOCX (mammoth) / TXT → text, line breaks preserved
  ├── app/actions.ts    mutations: create/delete resume & job, stage changes, sample data
  └── Supabase          Auth + Postgres, row-level security (users only ever see their own rows)
Deployed on Vercel
```

Scores are computed on read, not stored, so they always reflect the current engine and dictionary.

**Tables** ([`supabase/schema.sql`](supabase/schema.sql)): `resumes (label, raw_text)`, `jobs (title, company, raw_text, stage)`.

## What's incomplete / deliberately cut

- Score history over time (scores are computed live; an `analyses` table would store snapshots)
- LLM-assisted parsing and resume rewriting (available in the full landmyjob.app)
- Job discovery and auto-apply
- Skills outside the dictionary aren't detected; there's no UI to add them yet
- Scanned (image-only) PDFs can't be read; the app asks you to paste text instead
- The parser expects reasonably standard resumes (section headers such as "Experience" and "Skills", and dates like "Mar 2022 – Present")

## Run locally

1. Create a free [Supabase](https://supabase.com) project. In the **SQL editor**, run [`supabase/schema.sql`](supabase/schema.sql).
2. For quick testing, turn off **Authentication → Providers → Email → Confirm email** (otherwise new accounts must click a confirmation link first).
3. Then:

```bash
cp .env.example .env.local   # paste your project URL and anon key (Project Settings → API)
npm install
npm run dev                  # http://localhost:3000
npm test                     # 29 unit tests: engine + file extraction
```

Test upload files are in [`test-files/`](test-files) (the demo resume as PDF and DOCX).

### Deploy (Vercel)

Import the repo in Vercel and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables. If email confirmation is on, add your Vercel URL under Supabase **Authentication → URL Configuration** (Site URL and `https://<your-app>/auth/callback` as a redirect URL).

Troubleshooting:
- **"Your project's URL and Key are required"**: the variables were missing at build time. `NEXT_PUBLIC_*` values are inlined during the build, so after adding or changing them, **Redeploy** without the build cache.
- **"Invalid path specified in request URL"**: `NEXT_PUBLIC_SUPABASE_URL` must be just the Project URL, `https://<project-id>.supabase.co`, with no trailing slash and no `/rest/v1`.
- **"Invalid login credentials"** on a fresh deploy: no account exists yet. Use **Sign up** first.

## What I'd do next

1. Store analyses to show how a resume's score improves across versions over time
2. Swap dictionary extraction for LLM extraction behind the same `findSkills` interface, keeping the dictionary as a fallback
3. Let users add custom skills and tune weights per search
4. Follow-up reminders for applied jobs

## AI tools

I used AI-assisted tools during this build and reviewed all submitted code myself.
