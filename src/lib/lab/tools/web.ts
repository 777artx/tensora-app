import { ToolError } from "@/lib/lab/tools/meter";
import { safeFetch } from "@/lib/lab/tools/safe-fetch";

const UA = "OloraAgentTools/1.0 (+https://app.olora.si)";

function str(v: unknown, max = 500) {
  return String(v ?? "").trim().slice(0, max);
}

function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

export type SearchHit = { title: string; url: string; snippet: string };

/** Web search. Uses Brave or Tavily when a key is set, otherwise DuckDuckGo HTML. */
export async function toolSearch(input: Record<string, unknown>) {
  const q = str(input.query ?? input.q, 400);
  if (!q) throw new ToolError("query is required.");
  const limit = Math.min(20, Math.max(1, Number(input.limit) || 8));

  if (process.env.BRAVE_SEARCH_API_KEY) {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=${limit}`,
      { headers: { Accept: "application/json", "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY } }
    );
    if (!res.ok) throw new ToolError(`Search provider returned ${res.status}.`, 502);
    const data = (await res.json()) as { web?: { results?: { title: string; url: string; description?: string }[] } };
    return {
      query: q,
      provider: "brave",
      results: (data.web?.results || []).slice(0, limit).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: htmlToText(r.description || ""),
      })),
    };
  }

  if (process.env.TAVILY_API_KEY) {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query: q, max_results: limit }),
    });
    if (!res.ok) throw new ToolError(`Search provider returned ${res.status}.`, 502);
    const data = (await res.json()) as { results?: { title: string; url: string; content?: string }[] };
    return {
      query: q,
      provider: "tavily",
      results: (data.results || []).map((r) => ({ title: r.title, url: r.url, snippet: r.content || "" })),
    };
  }

  const res = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
    body: `q=${encodeURIComponent(q)}`,
  });
  if (!res.ok) throw new ToolError(`Search provider returned ${res.status}.`, 502);
  const html = await res.text();
  const results: SearchHit[] = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && results.length < limit) {
    let url = decodeEntities(m[1]);
    const uddg = url.match(/[?&]uddg=([^&]+)/);
    if (uddg) url = decodeURIComponent(uddg[1]);
    if (url.startsWith("//")) url = `https:${url}`;
    results.push({ title: htmlToText(m[2]), url, snippet: htmlToText(m[3]) });
  }
  return { query: q, provider: "duckduckgo", results };
}

/** Fetch one public page and return clean text. */
export async function toolScrape(input: Record<string, unknown>) {
  const url = str(input.url, 2000);
  if (!url) throw new ToolError("url is required.");
  const maxChars = Math.min(100_000, Math.max(500, Number(input.maxChars) || 20_000));
  let page;
  try {
    page = await safeFetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/json,text/plain" } });
  } catch (e) {
    throw new ToolError((e as Error).message, 400);
  }
  if (page.status >= 400) throw new ToolError(`Page returned ${page.status}.`, 502);
  const isHtml = page.contentType.includes("html");
  const title = isHtml ? htmlToText(page.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "") : "";
  const text = isHtml ? htmlToText(page.body) : page.body;
  return {
    url: page.finalUrl,
    status: page.status,
    contentType: page.contentType,
    title,
    text: text.slice(0, maxChars),
    truncated: text.length > maxChars,
  };
}

/** Social listening from open sources: Reddit and Hacker News. */
export async function toolSocial(input: Record<string, unknown>) {
  const q = str(input.query ?? input.q, 300);
  if (!q) throw new ToolError("query is required.");
  const limit = Math.min(25, Math.max(1, Number(input.limit) || 10));
  const sources = Array.isArray(input.sources) ? input.sources.map(String) : ["reddit", "hackernews"];

  const jobs: Promise<{ source: string; title: string; url: string; author: string; score: number; at: string }[]>[] = [];
  if (sources.includes("reddit")) {
    jobs.push(
      fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=new&limit=${limit}`, {
        headers: { "User-Agent": UA },
      })
        .then((r) => (r.ok ? r.json() : { data: { children: [] } }))
        .then((d: { data?: { children?: { data: Record<string, unknown> }[] } }) =>
          (d.data?.children || []).map(({ data: p }) => ({
            source: "reddit",
            title: String(p.title || ""),
            url: `https://reddit.com${p.permalink || ""}`,
            author: String(p.author || ""),
            score: Number(p.score || 0),
            at: new Date(Number(p.created_utc || 0) * 1000).toISOString(),
          }))
        )
        .catch(() => [])
    );
  }
  if (sources.includes("hackernews")) {
    jobs.push(
      fetch(`https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&hitsPerPage=${limit}`)
        .then((r) => (r.ok ? r.json() : { hits: [] }))
        .then((d: { hits?: Record<string, unknown>[] }) =>
          (d.hits || []).map((h) => ({
            source: "hackernews",
            title: String(h.title || h.story_title || String(h.comment_text || "").slice(0, 140)),
            url: String(h.url || `https://news.ycombinator.com/item?id=${h.objectID}`),
            author: String(h.author || ""),
            score: Number(h.points || 0),
            at: String(h.created_at || ""),
          }))
        )
        .catch(() => [])
    );
  }
  const posts = (await Promise.all(jobs)).flat().sort((a, b) => b.at.localeCompare(a.at));
  return { query: q, posts: posts.slice(0, limit * 2) };
}
