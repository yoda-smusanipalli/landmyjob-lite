import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { TextSourceFields } from "@/components/TextSourceFields";
import { createJob } from "@/app/actions";

export default function NewJobPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Add a job description</h1>
      <p className="mt-1 text-sm text-slate-600">
        Works best when the JD has &ldquo;Requirements&rdquo; and &ldquo;Nice to have&rdquo; sections, which most do.
      </p>
      <form action={createJob} className="card mt-6 space-y-5">
        <Alert error={searchParams.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="title" className="label">Job title</label>
            <input id="title" name="title" required maxLength={160} className="input" placeholder="Senior Full-Stack Engineer" />
          </div>
          <div>
            <label htmlFor="company" className="label">Company</label>
            <input id="company" name="company" maxLength={160} className="input" placeholder="Acme" />
          </div>
        </div>
        <TextSourceFields kind="job description" />
        <SubmitButton pendingText="Analyzing…">Save and analyze</SubmitButton>
      </form>
    </div>
  );
}
