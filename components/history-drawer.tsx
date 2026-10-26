"use client";

import { useEffect, useState } from "react";
import { PLATFORM_LABELS } from "@/lib/digest";
import { formatSavedAt, type HistoryEntry } from "@/lib/history";

export function HistoryDrawer({
  entries,
  activeId,
  onSelect,
  onRemove,
  onClear,
  onClose,
}: {
  entries: HistoryEntry[];
  activeId: string | null;
  onSelect: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [confirmingClear, setConfirmingClear] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-zinc-950/40 backdrop-blur-[1px]"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-md animate-drawer-in flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <h2 id="history-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              History
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {entries.length} saved {entries.length === 1 ? "digest" : "digests"} · stored in this browser
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="Close history"
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </header>

        {entries.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No digests yet</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Every summary you create is saved here automatically.
            </p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto p-2">
            {entries.map((entry) => {
              const active = entry.id === activeId;
              return (
                <li key={entry.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(entry)}
                    aria-current={active ? "true" : undefined}
                    className={`w-full rounded-lg py-3 pl-3 pr-11 text-left transition ${
                      active
                        ? "bg-indigo-50 dark:bg-indigo-500/10"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <span className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {entry.digest.title || entry.url}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{PLATFORM_LABELS[entry.digest.source.platform] ?? "Link"}</span>
                      <span aria-hidden>·</span>
                      <time dateTime={entry.savedAt}>{formatSavedAt(entry.savedAt)}</time>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(entry.id)}
                    aria-label={`Remove "${entry.digest.title}" from history`}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 opacity-100 transition hover:bg-zinc-200 hover:text-red-600 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-zinc-700 dark:hover:text-red-400"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
                      <path
                        fillRule="evenodd"
                        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {entries.length > 0 && (
          <footer className="border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
            {confirmingClear ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Delete all saved digests?</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(false)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClear();
                      setConfirmingClear(false);
                    }}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-500"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className="text-sm font-medium text-zinc-500 transition hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
              >
                Clear history
              </button>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}
