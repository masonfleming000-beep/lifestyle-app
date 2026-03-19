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

function extractFirstNumber(patterns: RegExp[], text: string): number {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseFloat(match[1]);
  }
  return 0;
}

function extractNutrientAmount(
  names: string[],
  text: string,
  unitPatterns: string[] = ["g", "mg", "mcg", "µg", "iu"]
): number {
  const joinedUnits = unitPatterns.join("|");
  for (const name of names) {
    const pattern = new RegExp(
      `${name}\\s+(\\d+(?:\\.\\d+)?)\\s*(?:${joinedUnits})`,
      "i"
    );
    const match = text.match(pattern);
    if (match) return parseFloat(match[1]);
  }
  return 0;
}

function extractNutrientWithUnit(
  names: string[],
  text: string,
  fallbackUnit: string
): { value: number; unit: string } {
  const unitPatterns = ["g", "mg", "mcg", "µg", "iu"];
  const joinedUnits = unitPatterns.join("|");

  for (const name of names) {
    const pattern = new RegExp(
      `${name}\\s+(\\d+(?:\\.\\d+)?)\\s*(${joinedUnits})`,
      "i"
    );
    const match = text.match(pattern);
    if (match) {
      return {
        value: parseFloat(match[1]),
        unit: match[2].toLowerCase(),
      };
    }
  }

  return { value: 0, unit: fallbackUnit.toLowerCase() };
}

export const onRequestGet = async ({ request }: any) => {
  const reqUrl = new URL(request.url);
  const page = (reqUrl.searchParams.get("url") || "").trim();

  if (!page) {
    return new Response(JSON.stringify({ error: "Missing url" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(page);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid url" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!parsed.hostname.includes("nutritionvalue.org")) {
    return new Response(JSON.stringify({ error: "Only nutritionvalue.org allowed" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const upstream = await fetch(parsed.toString(), {
    headers: {
      "user-agent": "Mozilla/5.0",
      "accept-language": "en-US,en;q=0.9",
    },
  });

  const html = await upstream.text();
  const text = stripTags(html);

  const pathName = decodeURIComponent(parsed.pathname.split("/").pop() || "")
    .replace(/_nutritional_value\.html$/i, "")
    .replace(/\.html$/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const prettyName = pathName
    ? pathName.charAt(0).toUpperCase() + pathName.slice(1)
    : "Food Item";

  const calories = extractFirstNumber(
    [
      /Amount Per Portion\s+Calories\s+(\d+(?:\.\d+)?)/i,
      /Calories\s+(\d+(?:\.\d+)?)/i,
      /contains\s+(\d+(?:\.\d+)?)\s+calories/i,
    ],
    text
  );

  const fat = extractFirstNumber(
    [
      /Total Fat\s+(\d+(?:\.\d+)?)\s*g/i,
      /Fat\s+(\d+(?:\.\d+)?)\s*g/i,
    ],
    text
  );

  const protein = extractFirstNumber(
    [
      /Protein\s+(\d+(?:\.\d+)?)\s*g/i,
    ],
    text
  );

  const carbs = extractFirstNumber(
    [
      /Total Carbohydrate\s+(\d+(?:\.\d+)?)\s*g/i,
      /Carbohydrate\s+(\d+(?:\.\d+)?)\s*g/i,
    ],
    text
  );

  const fiber = extractNutrientAmount(["Dietary Fiber", "Fiber"], text, ["g"]);
  const sugars = extractNutrientAmount(["Sugars"], text, ["g"]);
  const addedSugars = extractNutrientAmount(["Sugars, added", "Added sugars"], text, ["g"]);
  const sodium = extractNutrientAmount(["Sodium"], text, ["mg"]);
  const potassium = extractNutrientAmount(["Potassium"], text, ["mg"]);
  const calcium = extractNutrientAmount(["Calcium"], text, ["mg"]);
  const iron = extractNutrientAmount(["Iron"], text, ["mg"]);
  const magnesium = extractNutrientAmount(["Magnesium"], text, ["mg"]);
  const zinc = extractNutrientAmount(["Zinc"], text, ["mg"]);
  const copper = extractNutrientAmount(["Copper"], text, ["mg"]);
  const cholesterol = extractNutrientAmount(["Cholesterol"], text, ["mg"]);
  const saturatedFat = extractNutrientAmount(["Saturated fatty acids", "Saturated Fat"], text, ["g"]);
  const monounsaturatedFat = extractNutrientAmount(
    ["Monounsaturated fatty acids", "Monounsaturated fat"],
    text,
    ["g"]
  );
  const polyunsaturatedFat = extractNutrientAmount(
    ["Polyunsaturated fatty acids", "Polyunsaturated fat"],
    text,
    ["g"]
  );

  const niacin = extractNutrientWithUnit(["Niacin", "Vitamin B3"], text, "mg");

  return new Response(
    JSON.stringify({
      name: prettyName,
      calories,
      fat,
      carbs,
      protein,
      fiber,
      sugars,
      addedSugars,
      sodium,
      potassium,
      calcium,
      iron,
      magnesium,
      zinc,
      copper,
      cholesterol,
      saturatedFat,
      monounsaturatedFat,
      polyunsaturatedFat,
      niacin,
      sourceUrl: parsed.toString(),
      debugTextSample: text.slice(0, 900),
    }),
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    }
  );
};