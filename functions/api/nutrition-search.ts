export const onRequestGet = async ({ request }: any) => {
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

  // NutritionValue search URL pattern
  const targetUrl = `https://www.nutritionvalue.org/search.php?food_query=${encodeURIComponent(q)}`;

  const upstream = await fetch(targetUrl, {
    headers: {
      "user-agent": "Mozilla/5.0",
      "accept-language": "en-US,en;q=0.9",
    },
  });

  const html = await upstream.text();

  return new Response(JSON.stringify({ html }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
};