import { serialize } from "cookie";
import { success, failure } from "../../util";

/**
 * Sets the redirect cookie and directs the user to the top of authentication process.
 */
export default async function (request: Request) {
  const { searchParams } = new URL(request.url);
  if (!searchParams.has("redirect")) {
    return failure(401, "Redirect not supplied");
  }
  const maxAge = (Date.now() + 1000 * 60 * 60 * 24 * 1 - Date.now()) / 1000;
  return success(null, {
    status: 302,
    headers: {
      "Set-Cookie": serialize("redirect", searchParams.get("redirect")!, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge, // 1 day expiry
      }),
      Location: STYTCH_URL,
    },
  });
}
