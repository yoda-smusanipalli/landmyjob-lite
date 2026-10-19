import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { TextSourceFields } from "@/components/TextSourceFields";
import { createResume } from "@/app/actions";

export default function NewResumePage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Add a resume version</h1>
      <p className="mt-1 text-sm text-slate-600">
        Save each tailored version separately so you can compare them against the same job.
      </p>
      <form action={createResume} className="card mt-6 space-y-5">
        <Alert error={searchParams.error} />
        <div>
          <label htmlFor="label" className="label">Version name</label>
          <input id="label" name="label" required maxLength={120} className="input" placeholder="e.g. Full-stack, Oct 2026" />
        </div>
        <TextSourceFields kind="resume" />
        <SubmitButton pendingText="Reading resume…">Save resume</SubmitButton>
      </form>
    </div>
  );
}
