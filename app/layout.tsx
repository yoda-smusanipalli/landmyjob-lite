import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "LandMyJob Lite",
  description: "See how well your resume fits a job, and what to change, before you apply.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-sm text-white">L</span>
              LandMyJob <span className="font-normal text-slate-400">Lite</span>
            </Link>
            {user && (
              <nav className="flex flex-wrap items-center gap-4 text-sm">
                <Link href="/" className="text-slate-600 hover:text-ink">Dashboard</Link>
                <Link href="/resumes/new" className="text-slate-600 hover:text-ink">Add resume</Link>
                <Link href="/jobs/new" className="text-slate-600 hover:text-ink">Add job</Link>
                <span className="hidden text-slate-400 sm:inline">{user.email}</span>
                <form action={signOut}>
                  <button className="text-slate-600 hover:text-ink">Sign out</button>
                </form>
              </nav>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-400">
          A 2-hour take-home build. The full product lives at{" "}
          <a href="https://landmyjob.app" className="underline hover:text-slate-600" target="_blank" rel="noreferrer">
            landmyjob.app
          </a>
          .
        </footer>
      </body>
    </html>
  );
}
