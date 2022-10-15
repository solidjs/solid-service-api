import { SupabaseClient } from "@supabase/supabase-js";
import z, { ZodIssue } from "zod";
import { APIError } from "../../util/util";

const File = z.array(
  z.object({
    name: z.string().min(3).max(50),
    content: z.string(),
  })
);

/**
 * Parses a list of incoming REPL files if they are valid or not.
 *
 * @param files {Array<REPLFile>} A list of REPL files.
 * @returns Returns a list of Zod formatted issues
 */
export function validateREPLFiles(files: REPLFile[]): ZodIssue[] | null {
  const data = File.safeParse(files);
  if (!data.success) {
    return data.error.issues;
  }
  return null;
}

/**
 * Validates REPL ownership based on incoming values.
 *
 * @param id {string} UUID of the REPL to validate.
 * @param user_id {string} Identifier of the owning user.
 * @param write_token {string} One off write token of the user.
 * @returns Returns true of ownership can be confirmed
 */
export async function validateREPLOwnership(
  db: SupabaseClient,
  id: string,
  user_id?: string | null,
  write_token? : string,
): Promise<void> {
  console.log(user_id, write_token);
  if (!user_id && !write_token) {
    throw new APIError("Write token or user auth token required", "AUTHORIZATION_ERROR", 403);
  }
  const { data: repl, error } = await db
    .from("repls")
    .select("user_id, write_token")
    .eq("id", id);
  if (error !== null || repl.length == 0) {
    throw new APIError("Referenced REPL does not exist", "INVALID_REPL", 400);
  } else if (write_token && repl[0].write_token !== write_token) {
    throw new APIError("An invalid write token was supplied", "INVALID_WRITE_TOKEN", 401);
  } else if (user_id && repl[0].user_id !== user_id) {
    throw new APIError("Identified user does not own REPL", "INVALID_OWNER", 403);
  }
}
