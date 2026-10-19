import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { signIn, signUp } from "./actions";

export default function LoginPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  return (
    <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-2">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Know your fit before you apply.</h1>
        <p className="mt-3 text-slate-600">
          Upload your resume and a job description. LandMyJob Lite scores the match from 0 to 5, shows exactly which
          requirements you meet and miss, and tells you what to change.
        </p>
        <ul className="mt-5 space-y-2 text-sm text-slate-600">
          <li>• Required vs nice-to-have skills, including &ldquo;X or Y&rdquo; requirements</li>
          <li>• Seniority check: underqualified <em>and</em> overqualified</li>
          <li>• Compare resume versions against the same job</li>
          <li>• Rank every saved job for a resume</li>
        </ul>
      </section>

      <section className="card">
        <Alert error={searchParams.error} message={searchParams.message} />
        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="current-password" className="input" />
          </div>
          <div className="flex gap-3">
            <SubmitButton formAction={signIn} pendingText="Working…">
              Sign in
            </SubmitButton>
            <SubmitButton formAction={signUp} pendingText="Working…" className="btn-ghost">
              Create account
            </SubmitButton>
          </div>
          <p className="text-xs text-slate-500">New here? Enter an email and a password of 8+ characters, then choose Create account.</p>
        </form>
      </section>
    </div>
  );
}
