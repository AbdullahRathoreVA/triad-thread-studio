"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          next: params.get("next") ?? undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Sign in failed.");
        return;
      }

      // Refresh so the server layout re-runs its authoritative session check.
      router.push(data.redirectTo);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-4">
      <div>
        <label htmlFor="email" className="block text-[0.7rem] text-ink-400">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-xs border border-hairline bg-ink-850 px-4 py-3 text-sm text-ink-100 focus:border-gold-300/50 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-[0.7rem] text-ink-400">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-xs border border-hairline bg-ink-850 px-4 py-3 text-sm text-ink-100 focus:border-gold-300/50 focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="text-[0.78rem] text-red-400">
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="gold"
        size="lg"
        className="w-full"
        disabled={pending}
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : "Sign in"}
      </Button>
    </form>
  );
}
