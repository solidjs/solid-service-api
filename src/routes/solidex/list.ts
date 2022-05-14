import { success } from "../../util";
import { Resource } from "./types";
import videos from "@solid.js/solidex/dist/videos.json";
import podcasts from "@solid.js/solidex/dist/podcasts.json";
import articles from "@solid.js/solidex/dist/articles.json";
import packages from "@solid.js/solidex/dist/packages.json";

// Lists all available repls
export default async function (
  request: AuthenticatedRequest & {
    params: {
      type: string;
    };
  }
) {
  let list: Array<Resource> = [];
  switch (request.params.type) {
    case 'resources':
      list = [
        ...videos,
        ...articles,
        ...podcasts
      ];
      break;
    case 'packages':
      list = packages;
      break;
  }
  return success(list);
}
