import { success } from "../util";

/**
 * Queries the users current vote count.
 */
export default async function votes() {
  return success({
    version: "1.0",
    available: true,
    message: null,
  });
}
