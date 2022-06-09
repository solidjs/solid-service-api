import { parse } from "cookie";
import {
  failure,
  cors,
  request,
  createSupabase,
  createSession,
} from "../../util/util";

const DEFAULT_REDIRECT = "https://www.solidjs.com";

// Validates the Stytch token and redirects the user to their intended path
export default async function (req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const {
    status_code,
    error_message,
    session: { idp } = { idp: undefined },
  } = await request("/oauth/authenticate", {
    body: JSON.stringify({
      token,
      session_management_type: "idp",
    }),
  });
  if (status_code !== 200) {
    return failure(status_code, error_message);
  }
  // Collect the profile information
  let profile: Profile;
  try {
    profile = await fetch("https://api.github.com/user", {
      headers: {
        "User-Agent": "api.solidjs.com",
        Authorization: `token ${idp?.access_token}`,
      },
    }).then((res) => res.json());
  } catch (error) {
    return failure(500, "Couldn't fetch profile information");
  }
  // Create the session
  const session = await createSession<AuthSession>(req, "session");
  // Populate the session
  session.data = {
    id: profile.node_id,
    display: profile.login,
    avatar: profile.avatar_url,
    github_register: profile.created_at,
  };
  const redirect = parse(req.headers.get("cookie") || "");
  const expires_at = Date.now() + 1000 * 60 * 60 * 24 * 90; // 90 days
  const jwt = await session.commit(session, expires_at);

  // Upsert the user in the dataaset
  const db = createSupabase();
  await db.from("users").insert(
    [
      {
        id: profile.node_id,
        handle: profile.name,
        profile,
        provider: "github",
        lastlogin_at: "NOW()",
      },
    ],
    { upsert: true }
  );

  return new Response(null, {
    status: 302,
    headers: {
      ...cors(req),
      Location: (redirect.redirect || DEFAULT_REDIRECT) + `&token=${jwt}`,
    },
  });
}
