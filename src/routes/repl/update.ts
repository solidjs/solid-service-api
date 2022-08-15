import {
  failure,
  success,
  createSupabase,
  lengthInUtf8Bytes,
  internalError,
} from "../../util/util";
import { validateREPLFiles } from ".";

/**
 * Updates the REPL with newly supplied information.
 */
export default async function (
  request: AuthenticatedRequest & {
    content: {
      title: string;
      labels: string[];
      version: string;
      public: boolean;
      files: REPLFile[];
    };
    params: {
      id: string;
    };
  }
) {
  const db = createSupabase();
  const content = request.content;
  // Basic file validation
  const fileErrors = validateREPLFiles(content.files);
  if (fileErrors !== null) {
    return failure(404, fileErrors, "FILE_FORMAT_ERROR");
  }
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
      public: content.public,
      files: content.files,
      updated_at: "NOW()",
      size: lengthInUtf8Bytes(JSON.stringify(content.files)),
    })
    .match({ id: request.params.id });

  if (error !== null) return internalError();
  return success({});
}
