import type { MusicTrack } from "@/components/music";

const YOUTUBE_API_URL =
  "https://www.googleapis.com/youtube/v3/search";

export async function searchYouTube(
  query: string,
  limit = 8
): Promise<MusicTrack[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not configured");
  }

  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return [];
  }

  const params = new URLSearchParams({
    part: "snippet",
    q: cleanQuery,
    type: "video",
    videoCategoryId: "10",
    maxResults: String(Math.min(limit, 50)),
    key: apiKey,
  });

  const response = await fetch(
    `${YOUTUBE_API_URL}?${params.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `YouTube API error ${response.status}: ${text}`
    );
  }

  const data = await response.json();

  return (data.items ?? [])
    .filter(
      (item: any) =>
        item.id?.videoId &&
        item.snippet
    )
    .map((item: any) => ({
      videoId: item.id.videoId,
      title: decodeHtml(item.snippet.title),
      channel: decodeHtml(
        item.snippet.channelTitle
      ),
      thumbnail:
        item.snippet.thumbnails?.medium?.url ??
        item.snippet.thumbnails?.default?.url ??
        "",
    }));
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}