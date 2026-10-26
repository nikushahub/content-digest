// Browser-side digest history, persisted in localStorage and shared across tabs.

import { useSyncExternalStore } from "react";
import type { Digest } from "./digest";

export interface HistoryEntry {
  id: string;
  url: string;
  savedAt: string; // ISO timestamp
  digest: Digest;
}

const STORAGE_KEY = "content-digest:history:v1";
const CHANGE_EVENT = "content-digest:history-change";
const MAX_ENTRIES = 50;
const EMPTY: HistoryEntry[] = [];

// useSyncExternalStore needs a stable snapshot, so re-parse only when the raw string changes.
let cachedRaw: string | null = null;
let cachedEntries: HistoryEntry[] = EMPTY;

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage blocked (private mode, disabled site data)
  }
}

function isEntry(value: unknown): value is HistoryEntry {
  const v = value as HistoryEntry | null;
  return (
    typeof v?.id === "string" &&
    typeof v.url === "string" &&
    typeof v.savedAt === "string" &&
    typeof v.digest?.title === "string" &&
    Array.isArray(v.digest.keyTakeaways)
  );
}

function parse(raw: string | null): HistoryEntry[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isEntry) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): HistoryEntry[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedEntries = parse(raw);
  }
  return cachedEntries;
}

function getServerSnapshot(): HistoryEntry[] {
  return EMPTY;
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage); // other tabs
  window.addEventListener(CHANGE_EVENT, onChange); // this tab
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function write(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded: keep the newest half and try once more.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, Math.ceil(entries.length / 2))));
    } catch {
      // Storage unavailable; history just won't persist.
    }
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useHistory(): HistoryEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Re-summarizing the same link replaces its older entry and moves it to the top.
export function addHistoryEntry(entry: HistoryEntry) {
  const rest = getSnapshot().filter((e) => e.id !== entry.id && e.url !== entry.url);
  write([entry, ...rest].slice(0, MAX_ENTRIES));
}

export function removeHistoryEntry(id: string) {
  write(getSnapshot().filter((e) => e.id !== id));
}

export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function formatSavedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;

  if (date >= startOfToday) return `Today, ${time}`;
  if (date.getTime() >= startOfToday.getTime() - dayMs) return `Yesterday, ${time}`;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
