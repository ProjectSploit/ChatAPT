import { Router } from "express";

const router = Router();

router.post("/search", async (req, res) => {
  const { query } = req.body as { query?: string };
  if (!query) {
    res.status(400).json({ error: "query is required" });
    return;
  }

  const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CSE_KEY!}&cx=${process.env.GOOGLE_CSE_CX!}&q=${encodeURIComponent(query)}`;
  const serperUrl = "https://google.serper.dev/search";

  const [googleRes, serperRes] = await Promise.allSettled([
    fetch(googleUrl).then((r) => r.json()),
    fetch(serperUrl, {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query }),
    }).then((r) => r.json()),
  ]);

  const results: { title: string; link: string; snippet: string }[] = [];
  const seen = new Set<string>();

  if (googleRes.status === "fulfilled") {
    const items: any[] = googleRes.value?.items ?? [];
    for (const item of items.slice(0, 5)) {
      if (item.link && !seen.has(item.link)) {
        seen.add(item.link);
        results.push({ title: item.title ?? "", link: item.link, snippet: item.snippet ?? "" });
      }
    }
  }

  if (serperRes.status === "fulfilled") {
    const items: any[] = serperRes.value?.organic ?? [];
    for (const item of items.slice(0, 5)) {
      if (item.link && !seen.has(item.link)) {
        seen.add(item.link);
        results.push({ title: item.title ?? "", link: item.link, snippet: item.snippet ?? "" });
      }
    }
  }

  res.json({ results });
});

export default router;
