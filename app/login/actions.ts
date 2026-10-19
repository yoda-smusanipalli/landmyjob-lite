"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function credentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=" + encodeURIComponent("Enter your email and password."));
  return { email, password };
}

export async function signIn(formData: FormData) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials(formData));
  if (error) redirect("/login?error=" + encodeURIComponent(error.message));
  redirect("/");
}

export async function signUp(formData: FormData) {
  const { email, password } = credentials(formData);
  if (password.length < 8) redirect("/login?error=" + encodeURIComponent("Use a password of at least 8 characters."));
  const supabase = createClient();
  const origin = headers().get("origin") ?? "";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect("/login?error=" + encodeURIComponent(error.message));
  // With email confirmation turned on, there's no session until the link is clicked.
  if (!data.session) {
    redirect("/login?message=" + encodeURIComponent("Check your email to confirm your account, then sign in."));
  }
  redirect("/");
}
