import {
  failure,
  success,
  createSupabase,
  internalError,
} from "../../util/util";
import { validateREPLOwnership } from ".";

/**
 * Transfers a REPL to a user.
 */
export default async function (
  request: AuthenticatedRequest & {
    content: {
      write_token?: string;
    };
    params: {
      id: string;
    };
  }
) {
  const content = request.content;
  const db = createSupabase();
  // Check ownership of the REPL
  try {
    await validateREPLOwnership(
      db,
      request.params.id,
      null,
      content.write_token,
    );
  } catch (error: any) {
    return failure(
      error.status_code,
      error.message,
      error.status,
    );
  }
  const { error } = await db
    .from("repls")
    .update({
      user_id: request.session.data.id,
      transferred_at: new Date()
    })
    .match({ id: request.params.id });

  if (error !== null) return internalError();
  return success({});
}
