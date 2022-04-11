import { parse, serialize } from "cookie";
import * as jwt from "@tsndr/cloudflare-worker-jwt";
import { Router } from 'itty-router';
import cors from './cors';

declare global {
  var ENVIRONMENT: "production" | "development";
  var STYTCH_PROJECT_ID: string;
  var STYTCH_SECRET: string;
  var STYTCH_URL: string;
  var POSTGREST_ENDPOINT: string;
}

const API_TEST = "https://test.stytch.com/v1";
const API_LIVE = "https://api.stytch.com/v1";

const router = Router();

async function create_session<T = any>(
  request: Request,
  session_id: string,
  initial_data: T = {} as T
): Promise<Session<T>> {
  const session_token = parse(request.headers.get("cookie") || "")?.[
    session_id
  ];
  const token_data: any | undefined = session_token
    ? (await jwt.decode(session_token)) || undefined
    : undefined;
  const session_data: T = Object.assign(
    {},
    initial_data,
    token_data ? token_data?.payload : {}
  );
  const commit = async (session: Session<T>, expires_at: number) => {
    const isEmpty = Object.keys(session.data).length === 0;
    if (isEmpty) return await destroy();
    const session_data = await jwt.sign(
      {
        payload: session.data,
        exp: expires_at,
      },
      STYTCH_SECRET
    );
    return serialize(session_id, session_data, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: (expires_at - Date.now()) / 1000,
    });
  };
  const verify = async (): Promise<boolean> => {
    return (
      typeof session_token === "string" &&
      (await jwt.verify(session_token, STYTCH_SECRET)) &&
      ((await jwt.decode(session_token)) as any)?.exp > Date.now()
    );
  };
  const destroy = async () => {
    return serialize(session_id, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  };
  return {
    id: session_id,
    data: session_data,
    commit,
    verify,
    destroy,
    ...(session_token ? { expires_at: token_data?.exp } : {}),
  };
}

function request<T = any>(url: string, options: any): Promise<T> {
  return fetch(`${ENVIRONMENT === "production" ? API_LIVE : API_TEST}${url}`, {
    ...options,
    method: options.method || "POST",
    headers: {
      Authorization: "Basic " + btoa(`${STYTCH_PROJECT_ID}:${STYTCH_SECRET}`),
      "Content-Type": "application/json",
      ...options.headers,
    },
  }).then((res) => res.json());
}

function success(response: any, init?: ResponseInit) {
  return new Response(
    JSON.stringify({
      ...response,
      status_code: 200,
      time: Date.now(),
    }),
    {
      ...init,
      headers: {
        ...init?.headers,
      },
    }
  );
}

function failure(code: number, message: string) {
  return new Response(
    JSON.stringify({
      status_code: code,
      status_message: message,
      environment: ENVIRONMENT,
      api_url: ENVIRONMENT === "production" ? API_LIVE : API_TEST,
      time: Date.now(),
    }),
    {
      status: code,
      statusText: message,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

// function create_client() {
//   return new PostgrestClient(POSTGREST_ENDPOINT);
// }

// Ensures profiles exists in user table
// async function check_user(profile: Profile) {
//   const db = create_client();
//   // Query the users account
//   const { data, error } = await db
//     .from('users')
//     .select('id, blocked')
//     .eq('identifier', profile.id);
//   // await dbRequest();
//   if (error !== null) {
//     throw new Error('internal_error');
//   }
//   // If the account doesn't exist, create it
//   if (data.length == 0) {
//     db.from('users').insert([
//       {
//         github_id: profile.id,
//         github_handle: profile.name,
//         profile
//       }
//     ])
//   } else if (data[0].blocked === true) {
//     throw new Error('account_blocked');
//   }
//   return data[0];
// }

async function authorize_callback(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const {
    user_id = undefined,
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
        "User-Agent": "Stytch Experiment",
        Authorization: `token ${idp?.access_token}`,
      },
    }).then((res) => res.json());
  } catch (error) {
    return failure(500, "Couldn't fetch profile information");
  }
  // Create the session
  const session = await create_session<AuthSession>(req, "session");
  // Populate the session
  session.data = {
    user_id,
    profile,
  };
  // const user = await check_user(profile);
  const redirect = parse(req.headers.get("cookie") || "");
  const expires_at = Date.now() + 1000 * 60 * 60 * 24 * 90; // 90 days
  return new Response(null, {
    status: 302,
    headers: {
      ...cors(req),
      "Set-Cookie": await session.commit(session, expires_at),
      "Location": redirect.redirect || 'https://www.solidjs.com',
    }
  });
  // return success(
  //   {
  //     // solid_id: user.id,
  //     ...session.data,
  //     expires_at,
  //     cookies,
  //     derp: true
  //   },
  //   {
  //     headers: {
  //       "Set-Cookie": await session.commit(session, expires_at),
  //     },
  //   }
  // );
}

async function login(request: Request) {
  const { searchParams } = new URL(request.url)
  if (!searchParams.has('redirect')) {
    return failure(401, 'Redirect not supplied');
  }
  return new Response(null, {
    status: 302,
    headers: {
      ...cors(request),
      'Set-Cookie': serialize('redirect', searchParams.get('redirect')!, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: ((Date.now() + 1000 * 60 * 60 * 24 * 1) - Date.now()) / 1000, // 1 day expiry
      }),
      'Location': STYTCH_URL
    }
  });
}

async function profile(request: Request) {
  const session = await create_session<AuthSession>(request, "session");
  // Verify the session
  if (!(await session.verify())) {
    return failure(401, "Unauthenticated");
  }
  const expires_at = Date.now() + 1000 * 60 * 60 * 24 * 90; // 90 days
  return success(
    {
      id: session.data.user_id,
      display: session.data.profile.login,
      avatar: session.data.profile.avatar_url,
      github_register: session.data.profile.created_at,
    },
    {
      headers: {
        ...cors(request),
        "Set-Cookie": await session.commit(session, expires_at),
      },
    }
  );
}

async function revoke(request: Request) {
  if (request.method !== "DELETE") {
    return failure(405, "Method not allowed");
  }
  const session = await create_session<AuthSession>(request, "session");
  return success(
    {
      status_code: 200,
      status_message: "Session revoked",
    },
    {
      headers: {
        ...cors(request),
        "Set-Cookie": await session.destroy(),
      },
    }
  );
}

// Cors handler
function handleOptions(request: Request) {
  let headers = request.headers
  if (
    headers.get("Origin") !== null &&
    headers.get("Access-Control-Request-Method") !== null &&
    headers.get("Access-Control-Request-Headers") !== null
  ) {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers")!,
      },
    });
  } else {
    return new Response(null, {
      headers: {
        Allow: "GET, HEAD, POST, OPTIONS",
      },
    })
  }
}

// Router handlers
router.get('/profile', profile);
router.get('/auth/login', login);
router.get('/auth/callback', authorize_callback);
router.get('/auth/revoke', revoke);

router.all('*', () => new Response('Not Found.', { status: 404 }))

addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.method === "OPTIONS") {
    return handleOptions(event.request)
  }
  return event.respondWith(router.handle(event.request))
})
