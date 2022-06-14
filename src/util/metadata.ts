import * as cheerio from "cheerio/lib/slim";

type Meta = { [key: string]: string | undefined };

const readMetatag = (el: any, name: string) => {
  const prop = el.attr("name") || el.attr("property") || el.attr("itemprop");
  return prop == name ? el.attr("content") : null;
};

const readLink = (el: any, name: string) => {
  const prop = el.attr("name") || el.attr("property") || el.attr("itemprop");
  if (prop == name) {
    if (el.attr("content")) {
      return el.attr("content");
    }
    if (el.attr("href")) {
      return el.attr("href");
    }
  }
  return null;
};

const getMetaTags = async (
  url: string,
  requestInit?: Request | RequestInit | undefined
) => {
  if (!/(^http(s?):\/\/[^\s$.?#].[^\s]*)/i.test(url)) return {};
  const response = await fetch(url, requestInit);
  const body = await response.text();
  const $ = cheerio.load(body);
  const title = $("title");
  let og: Meta = {},
    meta: Meta = {},
    links: Meta = {};
  if (title) meta.title = $(title).text();
  const canonical = $("link[rel=canonical]");
  if (canonical) meta.url = canonical.attr("href");
  // Parse meta tag values
  const metas = $("meta");
  for (let i = 0; i < metas.length; i++) {
    const el = metas[i];
    [
      "title",
      "description",
      "image",
      "datePublished",
      "genre",
      "startDate",
    ].forEach((s) => {
      const val = readMetatag($(el), s);
      if (val) meta[s] = val;
    });
    [
      "og:title",
      "og:description",
      "og:image",
      "og:url",
      "og:site_name",
      "og:type",
    ].forEach((s) => {
      const val = readMetatag($(el), s);
      if (val) og[s.split(":")[1]] = val;
    });
  }
  // Parse link values
  const link = $("link");
  for (let i = 0; i < link.length; i++) {
    const el = link[i];
    ["name", "url"].forEach((s) => {
      const val = readLink($(el), s);
      if (val) links[s] = val;
    });
  }
  return { meta, og, links, $ };
};

export default getMetaTags;
