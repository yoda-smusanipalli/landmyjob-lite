"use client";

import { useFormStatus } from "react-dom";
import { useTransition } from "react";
import { updateStage } from "@/app/actions";
import { STAGES, STAGE_LABELS, type Stage } from "@/lib/stages";

export function SubmitButton({
  children,
  pendingText,
  className = "btn",
  formAction,
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" formAction={formAction} className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

const MAX_FILE_BYTES = 4 * 1024 * 1024;

/** File input that rejects files over 4 MB in the browser, before they hit the server's request limit. */
export function FileInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="file"
      onChange={(e) => {
        const input = e.currentTarget;
        const file = input.files?.[0];
        input.setCustomValidity(file && file.size > MAX_FILE_BYTES ? "This file is over 4 MB. Try a smaller file, or paste the text instead." : "");
        input.reportValidity();
      }}
    />
  );
}

export function StageSelect({ jobId, stage }: { jobId: string; stage: Stage }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      aria-label="Application stage"
      defaultValue={stage}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => updateStage(jobId, next));
      }}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
    >
      {STAGES.map((s) => (
        <option key={s} value={s}>
          {STAGE_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

export function ConfirmDelete({ action, id, what }: { action: (fd: FormData) => Promise<void>; id: string; what: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Delete this ${what}? This can't be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-danger">
        Delete
      </button>
    </form>
  );
}
