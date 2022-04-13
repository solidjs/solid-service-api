import {
  failure,
  success,
  createSupabase,
  lengthInUtf8Bytes,
} from "../../util";

/**
 * Creates a new REPL for the user and replies with the ID.
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
  const content = request.content;
  // TODO: Add repl content validation.
  const db = createSupabase();
  const { data: repls, error } = await db.from("repls").insert([
    {
      title: content.title,
      version: content.version,
      user_id: request.session.data.id,
      labels: content.labels,
      data: content.data,
      size: lengthInUtf8Bytes(content.data),
    },
  ]);
  if (error !== null) {
    return failure(404, "Internal or unknown error detected", "INTERNAL_ERROR");
  }
  return success({ id: repls[0].id });
}
