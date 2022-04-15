import * as jwt from "@tsndr/cloudflare-worker-jwt";
import { createClient } from "@supabase/supabase-js";

/**
 * Creates a new database client
 *
 * @returns Returns a new initialized Supabase client
 */
export function createSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    fetch,
  });
}

/**
 * Sends a structured success response to the user.
 *
 * @param data {object|string} Data to send back as serialized response
 * @param init {object} Response initialization values
 * @returns Response object to send back
 */
export function success(data: object | string | null, init?: ResponseInit) {
  return new Response(data ? JSON.stringify(data) : null, {
    ...init,
    headers: {
      ...cors(),
      ...init?.headers,
    },
  });
}

/**
 * Sends a failure response to the user.
 *
 * @param code {number} HTTP Status code
 * @param message {string} Message of the error
 * @returns Response object to send back
 */
export function failure(
  code: number,
  message: string | object,
  status_code: string | undefined = undefined
) {
  return new Response(
    JSON.stringify({
      status_code,
      status_message: message,
    }),
    {
      status: code,
      statusText: typeof message === 'string' ? message : 'ERROR',
      headers: {
        ...cors(),
      },
    }
  );
}

/**
 * Handles preflight OPTION requests.
 *
 * @param request {Request} Request object
 * @returns Properly structured preflight response
 */
export function handleOptions(request: Request) {
  let headers = request.headers;
  if (
    headers.get("Origin") !== null &&
    headers.get("Access-Control-Request-Method") !== null &&
    headers.get("Access-Control-Request-Headers") !== null
  ) {
    return new Response(null, {
      headers: {
        ...cors(request),
      },
    });
  } else {
    return new Response(null, {
      headers: {
        Allow: "GET, HEAD, POST, OPTIONS, PUT",
      },
    });
  }
}

/**
 * CORs output generator based on dynamic request.
 *
 * @param _request {Request} Incoming request object
 * @returns A set of default cors headers to reply with.
 */
export function cors(_request?: Request) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,OPTIONS",
    "Access-Control-Max-Age": "86400",
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

/**
 * General session management utility for handling JWTs.
 *
 * @param request {Request} The incoming request object
 * @param session_id {string} Session identifier
 * @param initial_data  {object} Initial data for the session
 * @returns {object.id} Session identifier
 * @returns {object.data} Session data object
 * @returns {object.commit} Function for commiting/serializing the session
 * @returns {object.verify} Helper function to verify the session
 */
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

/**
 * String size calculator that returns length in bytes.
 *
 * @param str {string} String to be measured
 * @returns {number} Size of the string in bytes
 */
export function lengthInUtf8Bytes(str: string): number {
  // Matches only the 10.. bytes that are non-initial characters in a multi-byte sequence.
  var m = encodeURIComponent(str).match(/%[89ABab]/g);
  return str.length + (m ? m.length : 0);
}

/**
 * Authentication middleware to validate the incoming user.
 *
 * @param request {Request} Request coming into the API.
 */
export async function withAuth(request: AuthenticatedRequest) {
  try {
    const session = await createSession<AuthSession>(request, "session");
    if (!(await session.verify())) {
      return failure(401, "Unauthenticated");
    }
    request.session = session;
  } catch (err) {
    return failure(
      401,
      "Your request could not be properly authenticated.",
      "UNAUTHENTICATED"
    );
  }
  return undefined;
}

/**
 * Authentication middleware to validate the incoming user.
 *
 * @param request {Request} Request coming into the API.
 */
export async function withOptionalAuth(request: AuthenticatedRequest) {
  if (request.headers.get("authorization") && request.headers.get("authorization") !== "") {
    return withAuth(request);
  }
  return undefined;
}
