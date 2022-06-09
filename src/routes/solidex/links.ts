import { failure, success } from "../../util/util";
import getMetaTags from "../../util/metadata";

// Validates and collects OpenGraph data of a URL for use in a submission
export default async function ( request: AuthenticatedRequest) {
  const urlParse = new URL(request.url);
  const link = urlParse.searchParams.get("url") || "";
  if (link == "") {
    return failure(
      404,
      "You must supply a URL in the url query string to parse",
      "MISSING_URL"
    );
  }
  // Typical browser headers should be set else sites such as dev.to wont reply at all
  try {
    const { meta, og, links, $ } = await getMetaTags(link, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.61 Safari/537.36",
        "accept-encoding": "gzip, deflate, br",
        "referer": "https://www.solidjs.com/",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-language": "en-US;q=0.8"
      }
    });
    // Sanitize and standardize the response body
    let response = {
      "title": og?.title || meta?.title || null,
      "site_name": og?.site_name || null,
      "type": og?.type || null,
      "url": og?.url || meta?.url || null,
      "description": og?.description || meta?.description || null,
      "image": og?.image || null,
      "author": links?.name || null,
      "author_url": links?.url || null,
      "published_at": meta?.startDate || meta?.datePublished || null,
    };
    // dev.to
    if ($ && link.includes('dev.to/')) {
      response['published_at'] = $('time').attr('datetime') || null;
    }
    // github.com
    if (link.includes('github.com/')) {
      const path = link.replace('https://', '');
      response['author'] = path.split('/')[1];
      response['author_url'] = `https://www.github.com/${response['author']}`;
    }
    return success(response);
  } catch(err) {
    return failure(
      404,
      "Failed to parse the supplied URL, sorry",
      "INTERNAL_ERROR"
    );
  }
}
