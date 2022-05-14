import { success } from "../../util";
import { Resource } from "./types";

// Lists all available repls
export default async function (
  request: AuthenticatedRequest & {
    content: Resource;
  }
) {
  // Perform validations
  request;
  return success({});
}
