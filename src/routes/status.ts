import { success } from "../util/util";

/**
 * Queries the users current vote count.
 */
export default async function votes() {
  return success({
    version: "1.0.9",
    available: true,
    message: null,
  });
}
