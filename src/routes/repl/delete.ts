import { failure, success, createSupabase } from "../../util";

/**
 * Soft deletes a users REPL
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
  const { count, error } = await db
    .from("repls")
    .select("*", { count: "exact" })
    .eq("id", request.params.id)
    .eq("user_id", request.session.data.id)
    .is("deleted_at", null);

  if (error !== null) {
    return failure(404, "Internal or unknown error detected", "INTERNAL_ERROR");
  }
  if (count == 0) {
    return failure(
      404,
      "An invalid or unowned REPL ID was supplied",
      "INVALID_REPL_ID"
    );
  }
  // Soft delete the record
  await db
    .from("repls")
    .update({ deleted_at: "NOW()" })
    .eq("id", request.params.id);

  return success({});
}
