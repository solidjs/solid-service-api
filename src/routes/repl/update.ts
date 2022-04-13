import {
  failure,
  success,
  createSupabase,
  lengthInUtf8Bytes,
} from "../../util";

/**
 * Updates the REPL with newly supplied information.
 */
export default async function (
  request: AuthenticatedRequest & {
    content: {
      title: string;
      labels: string[];
      version: string;
      data: string;
    };
    params: {
      id: string;
    };
  }
) {
  const db = createSupabase();
  const content = request.content;
  // TODO: Add repl content validation.

  // If an ID param is supplied then ensure it exists
  const { count } = await db
    .from("repls")
    .select("*", { count: "exact" })
    .eq("id", request.params.id)
    .eq("user_id", request.session.data.id);

  if (count == 0) {
    return failure(
      404,
      "An invalid or unowned REPL ID was supplied",
      "INVALID_REPL_ID"
    );
  }
  const { error } = await db
    .from("repls")
    .update({
      title: content.title,
      version: content.version,
      user_id: request.session.data.id,
      labels: content.labels,
      data: content.data,
      updated_at: "NOW()",
      size: lengthInUtf8Bytes(content.data),
    })
    .match({ id: request.params.id });

  if (error !== null) {
    return failure(404, "Internal or unknown error detected", "INTERNAL_ERROR");
  }
  return success({});
}
