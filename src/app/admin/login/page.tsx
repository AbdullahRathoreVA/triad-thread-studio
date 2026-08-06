import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Studio Admin",
  // Belt and braces alongside robots.ts — a login page must never be indexed.
  robots: { index: false, follow: false },
};

/**
 * Server shell. The form is a separate client component behind Suspense
 * because it calls `useSearchParams()` to preserve the post-login redirect —
 * and reading search params during a static prerender requires a boundary,
 * otherwise the whole route fails to build.
 */
export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-ink-950 px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center">
          <Image
            src="/brand/logo-primary.jpg"
            alt=""
            width={72}
            height={72}
            className="rounded-sm"
            priority
          />
          <h1 className="mt-7 font-display text-3xl text-ink-50">Studio Admin</h1>
          <p className="mt-2 text-[0.78rem] text-ink-500">
            Authorised personnel only.
          </p>
        </div>

        <Suspense
          fallback={<div className="mt-10 h-64" aria-busy="true" aria-label="Loading sign-in form" />}
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
