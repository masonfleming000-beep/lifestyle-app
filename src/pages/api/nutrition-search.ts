import type { APIRoute } from "astro";

type SearchResult = {
  title: string;
  url: string;
};

function decodeHtml(html: string): string {
  return html
    .replace(/&nbsp;/gi, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(html: string): string {
  return decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSearchResults(html: string): SearchResult[] {
  const anchors = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];

  const results = anchors
    .map((match) => {
      const href = match[1]?.trim() || "";
      const innerHtml = match[2]?.trim() || "";
      const title = stripTags(innerHtml);

      if (!href || !title) return null;
      if (!href.includes(".html")) return null;
      if (!href.includes("nutrition") && !href.includes("nutritional_value")) return null;

      const absoluteUrl = href.startsWith("http")
        ? href
        : `https://www.nutritionvalue.org${href.startsWith("/") ? "" : "/"}${href}`;

      return {
        title,
        url: absoluteUrl,
      };
    })
    .filter((item): item is SearchResult => Boolean(item))
    .filter(
      (item, index, arr) =>
        arr.findIndex((x) => x.url === item.url) === index
    )
    .slice(0, 10);

  return results;
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();

  if (!q) {
    return new Response(JSON.stringify({ error: "Missing q" }), {
      status: 400,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  }

  const targetUrl = `https://www.nutritionvalue.org/search.php?food_query=${encodeURIComponent(q)}`;

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        "user-agent": "Mozilla/5.0",
        "accept-language": "en-US,en;q=0.9",
      },
    });

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({
          error: "Upstream search failed",
          status: upstream.status,
        }),
        {
          status: 502,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        }
      );
    }

    const html = await upstream.text();
    const results = extractSearchResults(html);

    return new Response(JSON.stringify({ results }), {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Search request failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  }
};