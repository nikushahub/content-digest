"use client";

import { useState } from "react";
import { PLATFORM_LABELS, toMarkdown, type Digest } from "@/lib/digest";
import { formatSavedAt } from "@/lib/history";

export function DigestResult({
  url,
  digest,
  savedAt,
  onReset,
}: {
  url: string;
  digest: Digest;
  savedAt?: string; // set when the card is opened from history
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(toMarkdown(url, digest));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (e.g. insecure context); nothing useful to show.
    }
  }

  const meta = [
    PLATFORM_LABELS[digest.source.platform],
    digest.source.method === "transcript" ? "Transcript" : "Article text",
    `${digest.wordCount.toLocaleString()} words`,
    digest.language ? digest.language.toUpperCase() : null,
  ].filter(Boolean);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
      {savedAt && (
        <p className="mb-4 inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          From history · saved {formatSavedAt(savedAt)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {meta.map((item, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>·</span>}
            {item}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
          {digest.title}
        </h2>
        <span className="w-fit shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
          {digest.category}
        </span>
      </div>

      <div className="mt-5 space-y-4 text-[15px] leading-7 text-zinc-700 dark:text-zinc-300">
        {digest.summary
          .split(/\n\s*\n/)
          .filter((p) => p.trim())
          .map((paragraph, i) => (
            <p key={i}>{paragraph.trim()}</p>
          ))}
      </div>

      {digest.source.truncated && (
        <p className="mt-4 text-xs text-zinc-500">
          This source was very long, so only the first part was summarized.
        </p>
      )}

      <section className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
          Key takeaways
        </h3>
        <ol className="mt-3 space-y-3">
          {digest.keyTakeaways.map((point, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-6 text-zinc-700 dark:text-zinc-300">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {i + 1}
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ol>
      </section>

      {digest.tags.length > 0 && (
        <ul className="mt-8 flex flex-wrap gap-2">
          {digest.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              #{tag}
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-8 flex flex-col gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-sm text-zinc-500 underline-offset-4 hover:text-indigo-600 hover:underline dark:text-zinc-400 dark:hover:text-indigo-400"
        >
          {url}
        </a>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={copy}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {copied ? "Copied!" : "Copy as Markdown"}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            New digest
          </button>
        </div>
      </footer>
    </article>
  );
}
