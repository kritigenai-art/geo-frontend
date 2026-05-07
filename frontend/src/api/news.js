import axios from "axios";

// Fetch latest news headlines via Google News RSS
export const fetchLatestNews = async (placeName) => {
  try {
    const q = encodeURIComponent(placeName);
    const res = await axios.get(`/gnews/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`, {
      timeout: 8000,
      responseType: "text",
    });
    const parser = new DOMParser();
    const xml = parser.parseFromString(res.data, "text/xml");
    const items = Array.from(xml.querySelectorAll("item")).slice(0, 3);
    return items.map(item => ({
      title:  item.querySelector("title")?.textContent?.replace(/ - [^-]+$/, "").trim() || "",
      url:    item.querySelector("link")?.textContent?.trim() || "#",
      source: item.querySelector("source")?.textContent?.trim() || "News",
      date:   item.querySelector("pubDate")?.textContent?.trim() || "",
    })).filter(n => n.title);
  } catch { return []; }
};
