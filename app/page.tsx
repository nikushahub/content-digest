import { DigestApp } from "@/components/digest-app";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 sm:py-20">
      <DigestApp
        header={
          <header>
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Content Digest
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
              Paste a link. Get the gist.
            </h1>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              Summaries, key takeaways, and tags for articles, YouTube videos, and social posts.
            </p>
          </header>
        }
      />

      <footer className="mt-auto pt-16 text-xs text-zinc-400 dark:text-zinc-500">
        AI-generated summaries can contain mistakes. Check the source for anything important.
      </footer>
    </main>
  );
}
