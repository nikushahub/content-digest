# Content Digest

Paste a link (article, YouTube, Instagram, Facebook, TikTok, X, or a direct audio file) and get a summary, key takeaways, a category, and tags. The front end is Next.js. The n8n workflow in [`workflow.json`](workflow.json) does the extraction and the AI work.

The browser calls `app/api/digest/route.ts`, which forwards the request to `N8N_WEBHOOK_URL`. n8n is never called from the client.

## Webhook contract

`POST {N8N_WEBHOOK_URL}` with `Content-Type: application/json`

```json
{ "url": "https://www.youtube.com/watch?v=..." }
```

**Success (200)**

```json
{
  "id": "29",
  "status": "ok",
  "type": "text",
  "url": "https://...",
  "data": {
    "title": "string",
    "summary": "string (2-4 paragraphs separated by blank lines)",
    "keyTakeaways": ["string"],
    "tags": ["lowercase", "strings"],
    "category": "Technology | Business | Science | Health | Politics | Education | Entertainment | Lifestyle | Sports | Other",
    "language": "ISO 639-1 code",
    "source": { "platform": "youtube | instagram | facebook | tiktok | x | media | article", "method": "transcript | article", "truncated": false },
    "wordCount": 1234
  }
}
```

**Error (4xx/5xx)**: `{ "status": "error", "message": "Human-readable reason" }`

| Code | When |
|------|------|
| 400 | Missing or invalid URL |
| 404 | Video not found |
| 422 | No transcript or readable text (private, paywalled, no speech) |
| 429 | Supadata or Jina rate limit |
| 500 / 502 | AI or upstream service failure |
| 504 | Async transcription took longer than about 2 minutes |

Typical response times: articles take 5–30 s, captioned videos 10–40 s, and videos without captions (AI transcription) up to about 2 minutes.

## How the workflow works

1. **Classify URL** (Code node): validates the URL and picks a branch.
2. **Videos and social posts** go to the Supadata `/v1/transcript?mode=auto` endpoint, which uses existing captions or falls back to AI transcription. Long videos return `202 { jobId }`; the workflow then polls every 5 s, up to 24 times.
3. **Direct audio files** go to the Gemini "Transcribe a Recording" node.
4. **Everything else** is treated as an article and read with Jina Reader (`r.jina.ai`), which returns clean markdown.
5. **Check Content**: rejects text shorter than 80 characters and trims anything over 120k characters.
6. **Summarize**: a Basic LLM Chain using Gemini `gemini-3.6-flash` with a structured output parser. If that model fails, it falls back to `gemini-3.5-flash-lite`.

`id` is the n8n execution ID. It matches the `requestId` column in the backend history table.

## History

- **Browser:** every successful digest is saved to `localStorage` under `content-digest:history:v1`, up to 50 entries. Summarizing the same URL again replaces its old entry. The History drawer reopens a saved digest without calling n8n, and lets you delete one entry or clear them all. This history lives only in the user's browser. See [lib/history.ts](lib/history.ts).
- **n8n:** after the webhook responds, **Prepare History Row** passes every request, successful or failed, to **Save to History**, which writes it to the n8n Data Table `digest_history`. Columns: `requestId`, `status`, `url`, `platform`, `method`, `title`, `category`, `tags`, `summary`, `keyTakeaways` (JSON string), `language`, `wordCount`, `httpStatus`, `errorMessage`, plus the automatic `createdAt`. The save runs after the response and continues on error, so it never slows down or breaks a request. When you import `workflow.json` on another instance, create this table first and re-select it in **Save to History**.

### Credentials needed in n8n

- **Header Auth** with name `x-api-key` and your Supadata key. Used by *Supadata Transcript* and *Supadata Job Status*.
- **Google Gemini (PaLM) API**. Used by *Gemini Chat Model*, *Gemini Fallback Model*, and *Gemini Transcribe*.

When you import `workflow.json`, re-select these credentials on each of those nodes. Credential IDs are stripped from the export.

## Local development

```bash
cp .env.example .env.local   # point N8N_WEBHOOK_URL at your n8n webhook
npm install
npm run dev                  # http://localhost:3000
```

## Deployment notes

- The API route sets `maxDuration = 300` and gives n8n up to 180 s to respond.
- On Vercel, `N8N_WEBHOOK_URL` must be a publicly reachable URL, either n8n Cloud or a tunnel to your local n8n. `localhost` won't work.
