"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { cn, slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { saveProduct } from "./actions";

type Collection = { id: string; title: string };

export type ProductFormValues = {
  id?: string;
  slug: string;
  sku: string;
  title: string;
  subtitle: string;
  description: string;
  story: string;
  price: string;
  currency: string;
  category: string;
  gender: string;
  leatherSwatch: string;
  leatherGrain: number;
  features: string[];
  specs: { label: string; value: string }[];
  collectionId: string;
  published: boolean;
  featured: boolean;
  position: number;
  seoTitle: string;
  seoDesc: string;
};

export const EMPTY_PRODUCT: ProductFormValues = {
  slug: "",
  sku: "",
  title: "",
  subtitle: "",
  description: "",
  story: "",
  price: "",
  currency: "USD",
  category: "LEATHER_JACKET",
  gender: "UNISEX",
  leatherSwatch: "#45271a",
  leatherGrain: 26,
  features: [],
  specs: [],
  collectionId: "",
  published: false,
  featured: false,
  position: 0,
  seoTitle: "",
  seoDesc: "",
};

const CATEGORIES = [
  { id: "LEATHER_JACKET", label: "Leather jacket" },
  { id: "LEATHER_GOODS", label: "Leather goods" },
  { id: "SUBLIMATED_JERSEY", label: "Sublimated jersey" },
  { id: "ACCESSORY", label: "Accessory" },
  { id: "OTHER", label: "Other" },
];

export function ProductForm({
  initial,
  collections,
}: {
  initial: ProductFormValues;
  collections: Collection[];
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) => {
    setV((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorField(null);

    startTransition(async () => {
      const result = await saveProduct({
        ...v,
        basePriceCents: v.price,
        category: v.category as "LEATHER_JACKET",
        gender: v.gender as "UNISEX",
        features: v.features.filter((f) => f.trim()),
        specs: v.specs.filter((s) => s.label.trim() && s.value.trim()),
      });

      if (!result.ok) {
        setError(result.error);
        setErrorField(result.field ?? null);
        return;
      }
      setSaved(true);
      if (!v.id) router.push(`/admin/products/${result.id}`);
      else router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-8">
        <Section title="Basics">
          <Field
            label="Title"
            value={v.title}
            onChange={(x) => {
              set("title", x);
              // Auto-slug only while creating; changing a live slug breaks
              // every existing link and search ranking to that page.
              if (!v.id) set("slug", slugify(x));
            }}
            error={errorField === "title" ? error : undefined}
            className="sm:col-span-2"
          />
          <Field
            label="URL slug"
            value={v.slug}
            onChange={(x) => set("slug", x)}
            hint={`/products/${v.slug || "…"}`}
            error={errorField === "slug" ? error : undefined}
          />
          <Field
            label="SKU"
            value={v.sku}
            onChange={(x) => set("sku", x)}
            error={errorField === "sku" ? error : undefined}
          />
          <Field
            label="Subtitle"
            value={v.subtitle}
            onChange={(x) => set("subtitle", x)}
            optional
            className="sm:col-span-2"
          />
          <TextArea
            label="Description"
            value={v.description}
            onChange={(x) => set("description", x)}
            rows={4}
            className="sm:col-span-2"
          />
          <TextArea
            label="Story"
            value={v.story}
            onChange={(x) => set("story", x)}
            rows={3}
            optional
            className="sm:col-span-2"
          />
        </Section>

        <Section title="Selling points">
          <div className="sm:col-span-2">
            {v.features.map((f, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input
                  value={f}
                  onChange={(e) => {
                    const next = [...v.features];
                    next[i] = e.target.value;
                    set("features", next);
                  }}
                  className="flex-1 rounded-xs border border-hairline bg-ink-850 px-3 py-2.5 text-sm text-ink-100 focus:border-gold-300/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => set("features", v.features.filter((_, j) => j !== i))}
                  aria-label={`Remove point ${i + 1}`}
                  className="grid place-items-center rounded-xs border border-hairline px-3 text-ink-500 hover:text-red-300"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set("features", [...v.features, ""])}
              className="mt-1 inline-flex items-center gap-1.5 text-[0.75rem] text-gold-200 hover:text-gold-100"
            >
              <Plus size={13} /> Add a point
            </button>
          </div>
        </Section>

        <Section title="Specification table">
          <div className="sm:col-span-2">
            {v.specs.map((s, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input
                  value={s.label}
                  placeholder="Label"
                  onChange={(e) => {
                    const next = [...v.specs];
                    next[i] = { ...next[i], label: e.target.value };
                    set("specs", next);
                  }}
                  className="w-1/3 rounded-xs border border-hairline bg-ink-850 px-3 py-2.5 text-sm text-ink-100 focus:border-gold-300/50 focus:outline-none"
                />
                <input
                  value={s.value}
                  placeholder="Value"
                  onChange={(e) => {
                    const next = [...v.specs];
                    next[i] = { ...next[i], value: e.target.value };
                    set("specs", next);
                  }}
                  className="flex-1 rounded-xs border border-hairline bg-ink-850 px-3 py-2.5 text-sm text-ink-100 focus:border-gold-300/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => set("specs", v.specs.filter((_, j) => j !== i))}
                  aria-label={`Remove spec ${i + 1}`}
                  className="grid place-items-center rounded-xs border border-hairline px-3 text-ink-500 hover:text-red-300"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set("specs", [...v.specs, { label: "", value: "" }])}
              className="mt-1 inline-flex items-center gap-1.5 text-[0.75rem] text-gold-200 hover:text-gold-100"
            >
              <Plus size={13} /> Add a row
            </button>
          </div>
        </Section>

        <Section title="Search listing">
          <Field
            label="SEO title"
            value={v.seoTitle}
            onChange={(x) => set("seoTitle", x)}
            optional
            hint={`${v.seoTitle.length}/70 — Google truncates past this`}
            className="sm:col-span-2"
          />
          <TextArea
            label="SEO description"
            value={v.seoDesc}
            onChange={(x) => set("seoDesc", x)}
            rows={2}
            optional
            hint={`${v.seoDesc.length}/170`}
            className="sm:col-span-2"
          />
        </Section>
      </div>

      {/* ---- Sidebar --------------------------------------------------- */}
      <aside className="space-y-6">
        <div className="rounded-sm border border-hairline bg-ink-900 p-5">
          <h2 className="font-roman text-[0.6rem] uppercase tracking-[0.2em] text-gold-300">
            Price
          </h2>
          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <Field
              label="Base price"
              value={v.price}
              onChange={(x) => set("price", x)}
              placeholder="349.00"
              error={errorField === "basePriceCents" ? error : undefined}
            />
            <Field
              label="Currency"
              value={v.currency}
              onChange={(x) => set("currency", x.toUpperCase().slice(0, 3))}
              className="w-20"
            />
          </div>
        </div>

        <div className="rounded-sm border border-hairline bg-ink-900 p-5">
          <h2 className="font-roman text-[0.6rem] uppercase tracking-[0.2em] text-gold-300">
            Placement
          </h2>
          <div className="mt-4 space-y-4">
            <Select
              label="Category"
              value={v.category}
              onChange={(x) => set("category", x)}
              options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
            />
            <Select
              label="Gender"
              value={v.gender}
              onChange={(x) => set("gender", x)}
              options={[
                { value: "UNISEX", label: "Unisex" },
                { value: "MENS", label: "Men's" },
                { value: "WOMENS", label: "Women's" },
              ]}
            />
            <Select
              label="Collection"
              value={v.collectionId}
              onChange={(x) => set("collectionId", x)}
              options={[
                { value: "", label: "— none —" },
                ...collections.map((c) => ({ value: c.id, label: c.title })),
              ]}
            />
            <Field
              label="Sort position"
              value={String(v.position)}
              onChange={(x) => set("position", Number(x) || 0)}
              type="number"
            />
          </div>
        </div>

        <div className="rounded-sm border border-hairline bg-ink-900 p-5">
          <h2 className="font-roman text-[0.6rem] uppercase tracking-[0.2em] text-gold-300">
            3D render
          </h2>
          <p className="mt-3 text-[0.72rem] leading-relaxed text-ink-500">
            Until a photograph is uploaded, the product is rendered in 3D from
            these values.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="color"
              value={v.leatherSwatch}
              onChange={(e) => set("leatherSwatch", e.target.value)}
              aria-label="Material colour"
              className="size-10 cursor-pointer rounded-xs border-0 bg-transparent p-0"
            />
            <div className="flex-1">
              <label className="block text-[0.68rem] text-ink-400">
                Grain — {v.leatherGrain}
              </label>
              <input
                type="range"
                min={4}
                max={80}
                value={v.leatherGrain}
                onChange={(e) => set("leatherGrain", Number(e.target.value))}
                className="mt-1.5 w-full accent-[#b79976]"
              />
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-hairline bg-ink-900 p-5">
          <h2 className="font-roman text-[0.6rem] uppercase tracking-[0.2em] text-gold-300">
            Visibility
          </h2>
          <div className="mt-4 space-y-3">
            <Toggle
              label="Published"
              hint="Visible on the public site"
              checked={v.published}
              onChange={(x) => set("published", x)}
            />
            <Toggle
              label="Featured"
              hint="Promoted within its collection"
              checked={v.featured}
              onChange={(x) => set("featured", x)}
            />
          </div>
        </div>

        {error && !errorField && (
          <p
            role="alert"
            className="rounded-xs border border-red-500/30 bg-red-500/8 p-3.5 text-[0.78rem] text-red-300"
          >
            {error}
          </p>
        )}

        {saved && (
          <p className="rounded-xs border border-emerald-500/30 bg-emerald-500/8 p-3.5 text-[0.78rem] text-emerald-300">
            Saved.
          </p>
        )}

        <Button type="submit" variant="gold" size="md" className="w-full" disabled={pending}>
          {pending ? <Loader2 size={15} className="animate-spin" /> : "Save product"}
        </Button>
      </aside>
    </form>
  );
}

/* ---------------- form primitives ---------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-roman text-[0.62rem] uppercase tracking-[0.2em] text-gold-300">
        {title}
      </h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  hint,
  optional,
  className,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  hint?: string;
  optional?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = `p-${label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[0.7rem] text-ink-400">
        {label}
        {optional && <span className="text-ink-600"> — optional</span>}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className={cn(
          "mt-1.5 w-full rounded-xs border bg-ink-850 px-3 py-2.5 text-sm text-ink-100 focus:outline-none",
          error ? "border-red-500/50" : "border-hairline focus:border-gold-300/50",
        )}
        {...rest}
      />
      {(hint || error) && (
        <p className={cn("mt-1 text-[0.66rem]", error ? "text-red-400" : "text-ink-600")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  optional,
  hint,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  optional?: boolean;
  hint?: string;
  className?: string;
}) {
  const id = `p-${label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[0.7rem] text-ink-400">
        {label}
        {optional && <span className="text-ink-600"> — optional</span>}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xs border border-hairline bg-ink-850 p-3 text-sm text-ink-100 focus:border-gold-300/50 focus:outline-none"
      />
      {hint && <p className="mt-1 text-[0.66rem] text-ink-600">{hint}</p>}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = `p-${label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div>
      <label htmlFor={id} className="block text-[0.7rem] text-ink-400">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xs border border-hairline bg-ink-850 px-3 py-2.5 text-sm text-ink-100 focus:border-gold-300/50 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-ink-900">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-[#b79976]"
      />
      <span>
        <span className="block text-[0.78rem] text-ink-100">{label}</span>
        {hint && <span className="block text-[0.66rem] text-ink-600">{hint}</span>}
      </span>
    </label>
  );
}
