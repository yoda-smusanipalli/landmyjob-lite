import { FileInput } from "./client";

/** Shared "upload a file or paste text" fields for the resume and job forms. */
export function TextSourceFields({ kind }: { kind: "resume" | "job description" }) {
  return (
    <>
      <div>
        <label htmlFor="file" className="label">Upload {kind}</label>
        <FileInput
          id="file"
          name="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand hover:file:bg-indigo-100"
        />
        <p className="mt-1 text-xs text-slate-500">PDF, DOCX or TXT, up to 4 MB. A file takes priority over pasted text.</p>
      </div>
      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
        <div className="h-px flex-1 bg-slate-200" /> or paste <div className="h-px flex-1 bg-slate-200" />
      </div>
      <div>
        <label htmlFor="text" className="label">Paste {kind} text</label>
        <textarea id="text" name="text" rows={12} className="input font-mono text-xs" placeholder={`Paste the full ${kind} here…`} />
      </div>
    </>
  );
}
