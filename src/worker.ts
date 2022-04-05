import { parse, serialize } from "cookie";
import * as jwt from "@tsndr/cloudflare-worker-jwt";

const API_TEST = "https://test.stytch.com/v1";
const API_LIVE = "https://api.stytch.com/v1";

declare global {
  var ENVIORNMENT: "production" | "development";

  var STYTCH_PROJECT_ID: string;
  var STYTCH_SECRET: string;
}

function request<T = any>(url: string, options: any): Promise<T> {
  return fetch(`${ENVIORNMENT === "production" ? API_LIVE : API_TEST}${url}`, {
    ...options,
    method: options.method || "POST",
    headers: {
      Authorization: "Basic " + btoa(`${STYTCH_PROJECT_ID}:${STYTCH_SECRET}`),
      "Content-Type": "application/json",
      ...options.headers,
    },
  }).then((res) => res.json());
}

type Profile = {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name: string;
  company: string;
  blog: string;
  location: string;
  email: string;
  hireable: boolean;
  bio: string;
  twitter_username: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
};

type AuthSession = {
  user_id: string;
  profile: Profile;
};

type Session<T> = {
  readonly id: string;
  readonly expires_at?: number;
  data: T;

  commit(session: Session<T>, expires_at: number): Promise<string>;
  verify(): Promise<boolean>;
  destroy(): Promise<string>;
};

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
        "Content-Type": "application/json",
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
      environment: ENVIORNMENT,
      api_url: ENVIORNMENT === "production" ? API_LIVE : API_TEST,
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

  const expires_at = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days

  return success(
    {
      ...session.data,
      expires_at,
    },
    {
      headers: {
        "Set-Cookie": await session.commit(session, expires_at),
      },
    }
  );
}

async function authorize(request: Request) {
  const session = await create_session<AuthSession>(request, "session");

  // Verify the session
  if (!(await session.verify())) {
    return failure(401, "Unauthenticated");
  }

  const expires_at = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days

  return success(
    {
      ...session.data,
      expires_at,
    },
    {
      headers: {
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
        "Set-Cookie": await session.destroy(),
      },
    }
  );
}

async function handleRequest(request: Request) {
  try {
    const url = new URL(request.url);

    const paths = url.pathname.split("/");

    switch (paths[1]) {
      case "auth": {
        switch (paths[2]) {
          case "callback":
            return await authorize_callback(request);
          case "authorize":
            return await authorize(request);
          case "revoke":
            return await revoke(request);
        }
      }
    }

    return new Response(
      JSON.stringify({
        status_code: 404,
        status_message: "Resource not found",
        time: Date.now(),
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: {
          code: (error as any).code || 500,
          message: (error as any).message || "Internal server error",
        },
      }),
      {
        status: (error as any).code || 500,
        statusText: (error as any).message || "Internal server error",
      }
    );
  }
}

addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request));
});
