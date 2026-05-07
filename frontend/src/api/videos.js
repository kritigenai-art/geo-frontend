import axios from "axios";

// Fetch YouTube videos — scrapes ytInitialData from YouTube's own search page via Vite proxy
export const fetchVideos = async (cityName) => {
  const query = encodeURIComponent(cityName + " most visited places travel");

  // ── 1. Scrape YouTube search page (no API key, no third-party service)
  try {
    const res = await axios.get(`/ytsearch/results?search_query=${query}&hl=en`, {
      timeout: 10000,
      responseType: "text",
    });

    // YouTube embeds all search data as ytInitialData in the HTML
    const match = res.data.match(/var ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s);
    if (match) {
      const ytData = JSON.parse(match[1]);
      const sectionContents =
        ytData?.contents?.twoColumnSearchResultsRenderer
          ?.primaryContents?.sectionListRenderer
          ?.contents?.[0]?.itemSectionRenderer?.contents || [];

      const videos = sectionContents
        .filter(c => c.videoRenderer?.videoId)
        .slice(0, 4)
        .map(c => {
          const v = c.videoRenderer;
          return {
            id:      v.videoId,
            title:   v.title?.runs?.[0]?.text || `${cityName} Travel`,
            channel: v.ownerText?.runs?.[0]?.text || "YouTube",
            views:   v.viewCountText?.simpleText || "Trending",
            thumb:   `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
            url:     `https://www.youtube.com/watch?v=${v.videoId}`,
          };
        });

      if (videos.length > 0) return videos;
    }
  } catch { /* fall through */ }

  // ── 2. Wikipedia external YouTube links
  try {
    const wRes = await axios.get(
      `/wikipedia/w/api.php?action=query&titles=${encodeURIComponent(cityName)}&prop=extlinks&ellimit=50&format=json&origin=*`,
      { timeout: 6000 }
    );
    const pages = Object.values(wRes.data.query?.pages || {});
    const ytUrls = (pages[0]?.extlinks || [])
      .map(l => l["*"])
      .filter(u => u?.includes("youtube.com/watch?v="))
      .slice(0, 4);

    if (ytUrls.length > 0) {
      return ytUrls.map(url => {
        const videoId = new URL(url).searchParams.get("v");
        return {
          id:      videoId,
          title:   `${cityName} — Featured Video`,
          channel: "YouTube",
          views:   "Featured",
          thumb:   `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          url:     `https://www.youtube.com/watch?v=${videoId}`,
        };
      });
    }
  } catch { /* fall through */ }

  // ── 3. Guaranteed fallback — always show search cards so section is never empty
  return [
    {
      id:      null,
      title:   `Top Places to Visit in ${cityName}`,
      channel: "Search on YouTube",
      views:   "Click to Watch",
      thumb:   `https://picsum.photos/seed/${cityName}yt1/800/450`,
      url:     `https://www.youtube.com/results?search_query=${encodeURIComponent(cityName + " top places to visit")}`,
    },
    {
      id:      null,
      title:   `${cityName} Travel Guide 2025`,
      channel: "Search on YouTube",
      views:   "Click to Watch",
      thumb:   `https://picsum.photos/seed/${cityName}yt2/800/450`,
      url:     `https://www.youtube.com/results?search_query=${encodeURIComponent(cityName + " travel guide")}`,
    },
  ];
};
