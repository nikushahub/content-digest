// Shared types and helpers for the n8n "Content Digest" webhook contract (see README.md).

export type Platform =
  | "youtube"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "x"
  | "media"
  | "article";

export interface Digest {
  title: string;
  summary: string;
  keyTakeaways: string[];
  tags: string[];
  category: string;
  language: string;
  source: {
    platform: Platform;
    method: "article" | "transcript";
    truncated: boolean;
  };
  wordCount: number;
}

export type DigestResponse =
  | { status: "ok"; id?: string; type: "text"; url: string; data: Digest }
  | { status: "error"; message: string };

export const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  x: "X",
  media: "Audio file",
  article: "Article",
};

export function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url;
  } catch {
    return null;
  }
}

// Mirrors the "Classify URL" node in the n8n workflow, so the badge matches what n8n will do.
export function detectPlatform(value: string): Platform | null {
  const url = parseHttpUrl(value);
  if (!url) return null;

  const host = url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
  const is = (...domains: string[]) =>
    domains.some((d) => host === d || host.endsWith(`.${d}`));

  if (is("youtube.com", "youtu.be", "youtube-nocookie.com")) return "youtube";
  if (is("instagram.com")) return "instagram";
  if (is("facebook.com", "fb.watch", "fb.com")) return "facebook";
  if (is("tiktok.com")) return "tiktok";
  if (is("x.com", "twitter.com")) return "x";
  if (/\.(mp3|m4a|wav|ogg|oga|flac|aac|opus|mp4|webm)$/i.test(url.pathname)) return "media";
  return "article";
}

export function toMarkdown(url: string, digest: Digest): string {
  return [
    `# ${digest.title}`,
    "",
    digest.summary,
    "",
    "## Key takeaways",
    ...digest.keyTakeaways.map((point) => `- ${point}`),
    "",
    `**Category:** ${digest.category}`,
    `**Tags:** ${digest.tags.map((tag) => `#${tag.replace(/\s+/g, "-")}`).join(" ")}`,
    `**Source:** ${url}`,
  ].join("\n");
}
