"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { detectPlatform, PLATFORM_LABELS, type DigestResponse, type Platform } from "@/lib/digest";
import {
  addHistoryEntry,
  clearHistory,
  removeHistoryEntry,
  useHistory,
  type HistoryEntry,
} from "@/lib/history";
import { DigestResult } from "./digest-result";
import { HistoryDrawer } from "./history-drawer";

type State =
  | { phase: "idle" }
  | { phase: "loading"; platform: Platform }
  | { phase: "done"; entry: HistoryEntry; fromHistory: boolean }
  | { phase: "error"; message: string };

const SOURCES = ["Articles", "YouTube", "Instagram", "Facebook", "TikTok", "X", "Audio files"];
const SLOW_AFTER_SECONDS = 10;

function fallbackId() {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function DigestApp({ header }: { header: ReactNode }) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<State>({ phase: "idle" });
  const [elapsed, setElapsed] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Bumped on every new request, cancel, or history pick so stale responses are ignored.
  const requestRef = useRef(0);
  const history = useHistory();

  const platform = detectPlatform(url);
  const loading = state.phase === "loading";

  useEffect(() => {
    if (!loading) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [loading]);

  function cancelInFlight() {
    requestRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!platform || loading) return;

    const token = ++requestRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setElapsed(0);
    setState({ phase: "loading", platform });

    try {
      const res = await fetch("/api/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => null)) as DigestResponse | null;
      if (token !== requestRef.current) return;

      if (data?.status === "ok") {
        const entry: HistoryEntry = {
          id: data.id ?? fallbackId(),
          url: data.url,
          savedAt: new Date().toISOString(),
          digest: data.data,
        };
        addHistoryEntry(entry);
        setState({ phase: "done", entry, fromHistory: false });
      } else {
        setState({
          phase: "error",
          message: data?.message ?? `Something went wrong (HTTP ${res.status}).`,
        });
      }
    } catch {
      if (token !== requestRef.current) return;
      setState({ phase: "error", message: "Network error. Check your connection and try again." });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  function cancel() {
    cancelInFlight();
    setState({ phase: "idle" });
  }

  function reset() {
    setUrl("");
    setState({ phase: "idle" });
  }

  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  function openFromHistory(entry: HistoryEntry) {
    cancelInFlight();
    setUrl(entry.url);
    setState({ phase: "done", entry, fromHistory: true });
    setHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex items-start justify-between gap-4">
        {header}
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          aria-haspopup="dialog"
          className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 text-zinc-500" aria-hidden>
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
              clipRule="evenodd"
            />
          </svg>
          History
          {history.length > 0 && (
            <span className="rounded-full bg-zinc-100 px-1.5 text-xs tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {history.length}
            </span>
          )}
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="url" className="sr-only">
          Link to summarize
        </label>
        <div className="relative flex-1">
          <input
            id="url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="Paste a link to an article, video, or reel…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            className="h-13 w-full rounded-xl border border-zinc-300 bg-white pl-4 pr-28 text-base text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          {platform && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {PLATFORM_LABELS[platform]}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={!platform || loading}
          className="h-13 rounded-xl bg-indigo-600 px-6 font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
        >
          {loading ? "Working…" : "Summarize"}
        </button>
      </form>

      {state.phase === "idle" && (
        <ul className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          {SOURCES.map((source) => (
            <li key={source} className="rounded-full border border-zinc-200 px-2.5 py-1 dark:border-zinc-800">
              {source}
            </li>
          ))}
        </ul>
      )}

      <div aria-live="polite" className="mt-8">
        {state.phase === "loading" && (
          <LoadingCard platform={state.platform} elapsed={elapsed} onCancel={cancel} />
        )}

        {state.phase === "error" && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          >
            <p>{state.message}</p>
            <button
              type="button"
              onClick={() => submit()}
              disabled={!platform}
              className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 font-medium transition hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-900/40"
            >
              Try again
            </button>
          </div>
        )}

        {state.phase === "done" && (
          <DigestResult
            key={state.entry.id}
            url={state.entry.url}
            digest={state.entry.digest}
            savedAt={state.fromHistory ? state.entry.savedAt : undefined}
            onReset={reset}
          />
        )}
      </div>

      {historyOpen && (
        <HistoryDrawer
          entries={history}
          activeId={state.phase === "done" ? state.entry.id : null}
          onSelect={openFromHistory}
          onRemove={removeHistoryEntry}
          onClear={clearHistory}
          onClose={closeHistory}
        />
      )}
    </div>
  );
}

function LoadingCard({
  platform,
  elapsed,
  onCancel,
}: {
  platform: Platform;
  elapsed: number;
  onCancel: () => void;
}) {
  const isArticle = platform === "article";
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-indigo-500" />
          </span>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {isArticle ? "Reading the article" : `Getting the ${PLATFORM_LABELS[platform]} transcript`} and
            writing your digest…
          </p>
        </div>
        <span className="font-mono text-sm tabular-nums text-zinc-500">{elapsed}s</span>
      </div>

      {elapsed >= SLOW_AFTER_SECONDS && (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          {isArticle
            ? "Long pages take a little longer. Hang tight."
            : "Videos without captions are transcribed by AI, which can take a minute or two."}
        </p>
      )}

      <div className="mt-6 space-y-3" aria-hidden>
        <div className="h-5 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/70" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/70" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/70" />
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="mt-6 text-sm font-medium text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
      >
        Cancel
      </button>
    </div>
  );
}
