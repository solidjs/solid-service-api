import { createClient } from '@supabase/supabase-js';
import * as jwt from "@tsndr/cloudflare-worker-jwt";

// Creates a new database client
export function createSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    fetch
  });
}

// Very basic success handler
export function success(response: any, init?: ResponseInit) {
  return new Response(
    JSON.stringify(response),
    {
      ...init,
      headers: {
        ...init?.headers,
      },
    }
  );
}

// Helpful failure handler
export function failure(code: number, message: string) {
  return new Response(
    JSON.stringify({
      status_code: code,
      status_message: message,
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

// Cors handler pre-flight requests
export function handleOptions(request: Request) {
  let headers = request.headers
  if ( 
    headers.get("Origin") !== null &&
    headers.get("Access-Control-Request-Method") !== null &&
    headers.get("Access-Control-Request-Headers") !== null
  ) {
    return new Response(null, {
      headers: {
        ...cors(request),       
      }
    });
  } else {
    return new Response(null, {
      headers: {
        Allow: "GET, HEAD, POST, OPTIONS",
      },
    })
  }
}

// Cors output generator based on dynamic request
export function cors(_request: Request) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Max-Age": "86400"
  };
}

// Helpful request function
export function request<T = any>(url: string, options: any): Promise<T> {
  return fetch(`${STYTCH_API}${url}`, {
    ...options,
    method: options.method || "POST",
    headers: {
      Authorization: "Basic " + btoa(`${STYTCH_PROJECT_ID}:${STYTCH_SECRET}`),
      "Content-Type": "application/json",
      ...options.headers,
    },
  }).then((res) => res.json());
}

// Session decomposition and management utility
export async function createSession<T = any>(
  request: Request,
  session_id: string,
  initial_data: T = {} as T
): Promise<Session<T>> {
  let session_token = request.headers.get("authorization");
  if (session_token) {
    session_token = session_token.substring(7);
  }
  const token_data: any | undefined = session_token
  ? (await jwt.decode(session_token)) || undefined
  : undefined;
  const session_data: T = Object.assign(
    {},
    initial_data,
    token_data ? token_data?.payload : {}
  );
  const commit = async (session: Session<T>, expires_at: number) => {
    return await jwt.sign(
      {
        payload: session.data,
        exp: expires_at,
      },
      STYTCH_SECRET
    );
  };
  const verify = async (): Promise<boolean> => {
    return (
      typeof session_token === "string" &&
      (await jwt.verify(session_token, STYTCH_SECRET)) &&
      ((await jwt.decode(session_token)) as any)?.exp > Date.now()
    );
  };
  return {
    id: session_id,
    data: session_data,
    commit,
    verify,
    ...(session_token ? { expires_at: token_data?.exp } : {}),
  };
}

// Calculates the length of a string
export function lengthInUtf8Bytes(str: string): number {
  // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
  var m = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (m ? m.length : 0);
}
