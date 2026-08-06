/**
 * Launch gate.
 *
 * Fails if any business detail is still a placeholder, or if a secret is
 * missing in a production build. This exists because the single most damaging
 * thing this site could do is go live quoting an invented phone number or a
 * lead time nobody can honour.
 *
 * Run manually, or wire into CI before the production deploy step.
 */

import { site, PLACEHOLDER } from "../src/config/site";

type Finding = { path: string; detail: string };

function walk(value: unknown, path: string, findings: Finding[]) {
  if (value === PLACEHOLDER) {
    findings.push({ path, detail: "still a placeholder" });
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      walk(child, path ? `${path}.${key}` : key, findings);
    }
  }
}

const findings: Finding[] = [];
walk(site, "site", findings);

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SITE_URL",
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
];

const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);

if (process.env.NEXT_PUBLIC_SITE_URL?.includes("localhost")) {
  findings.push({
    path: "env.NEXT_PUBLIC_SITE_URL",
    detail: "still points at localhost",
  });
}

const secret = process.env.AUTH_SECRET;
if (secret && secret.length < 32) {
  findings.push({
    path: "env.AUTH_SECRET",
    detail: `only ${secret.length} characters — 32 is the minimum`,
  });
}

if (findings.length === 0 && missingEnv.length === 0) {
  console.log("✔ No placeholders. Every required value is set.");
  process.exit(0);
}

console.error("\n✖ Not ready to launch.\n");

if (findings.length) {
  console.error("  Unset business details (src/config/site.ts):");
  for (const f of findings) console.error(`    · ${f.path} — ${f.detail}`);
}

if (missingEnv.length) {
  console.error("\n  Missing environment variables (see .env.example):");
  for (const key of missingEnv) console.error(`    · ${key}`);
}

console.error(
  "\n  These are deliberate blanks, not bugs. Publishing a guessed address,\n" +
    "  phone number or lead time damages trust far more than omitting it.\n",
);

process.exit(1);
