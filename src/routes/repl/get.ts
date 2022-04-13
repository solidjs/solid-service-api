import { failure, success, createSupabase } from "../../util";

/**
 * Retrieves a users REPL from the database.
 */
export default async function (
  request: AuthenticatedRequest & {
    params: {
      id: string;
    };
  }
) {
  // Check if the record exists
  const db = createSupabase();
  const { data: repls, error } = await db
    .from("repls")
    .select("id,title,labels,data,version,size,created_at,updated_at")
    .eq("id", request.params.id)
    .eq("user_id", request.session.data.id)
    .is("deleted_at", null);

  if (error !== null) {
    return failure(404, "Internal or unknown error detected", "INTERNAL_ERROR");
  }
  if (repls.length == 0 || repls === null) {
    return failure(
      404,
      "An invalid or unowned REPL ID was supplied",
      "INVALID_REPL_ID"
    );
  }
  return success(repls[0]);
}
