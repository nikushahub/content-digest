import { parseHttpUrl, type DigestResponse } from "@/lib/digest";

// Video transcription can take a while; give the function room on Vercel.
export const maxDuration = 300;

const UPSTREAM_TIMEOUT_MS = 180_000;

function errorResponse(message: string, status: number) {
  const body: DigestResponse = { status: "error", message };
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return errorResponse("The server is missing N8N_WEBHOOK_URL.", 500);
  }

  let url: unknown;
  try {
    ({ url } = await request.json());
  } catch {
    return errorResponse("Request body must be JSON like { \"url\": \"https://…\" }.", 400);
  }
  if (typeof url !== "string" || !parseHttpUrl(url)) {
    return errorResponse("Please enter a valid http(s) link.", 400);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // Skips ngrok's browser warning page when n8n is reached through an ngrok tunnel.
    "ngrok-skip-browser-warning": "true",
  };
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (secret) headers["X-Digest-Secret"] = secret;

  let upstream: Response;
  try {
    upstream = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ url: url.trim() }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return errorResponse("This is taking too long. Try a shorter video, or try again later.", 504);
    }
    return errorResponse("Couldn't reach the digest service. Please try again in a moment.", 502);
  }

  const data = (await upstream.json().catch(() => null)) as DigestResponse | null;
  if (!data || (data.status !== "ok" && data.status !== "error")) {
    const message =
      upstream.status === 401 || upstream.status === 403
        ? "The digest service rejected this server's credentials. Check N8N_WEBHOOK_SECRET."
        : upstream.status === 404
          ? "The digest workflow isn't active in n8n, or the tunnel is down."
          : `Unexpected response from the digest service (HTTP ${upstream.status}).`;
    return errorResponse(message, 502);
  }

  return Response.json(data, { status: upstream.ok ? 200 : upstream.status });
}
