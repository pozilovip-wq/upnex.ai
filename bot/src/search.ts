import { tavily } from "@tavily/core";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });

export async function searchUniversities(country: string, program: string, extras: string = ""): Promise<string> {
  if (!process.env.TAVILY_API_KEY) return "";
  try {
    const query = `best universities in ${country} for ${program} students from Uzbekistan ${extras} scholarships grants 2025 2026 requirements`;
    const result = await client.search(query, {
      maxResults: 5,
      searchDepth: "basic",
    });

    if (!result.results?.length) return "";

    return result.results
      .map((r) => `[${r.title}]: ${r.content?.slice(0, 300)}`)
      .join("\n\n");
  } catch (err) {
    console.error("Tavily search error:", err);
    return "";
  }
}
