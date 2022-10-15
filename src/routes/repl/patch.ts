import {
  failure,
  success,
  createSupabase,
  lengthInUtf8Bytes,
  internalError,
} from "../../util/util";
import { validateREPLOwnership, validateREPLFiles } from ".";

/**
 * Updates the REPL with newly supplied information.
 */
export default async function (
  request: AuthenticatedRequest & {
    content: {
      write_token?: string;
      title?: string;
      labels?: string[];
      version?: string;
      public?: boolean;
      files?: REPLFile[];
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
      request.session?.data?.id,
      content.write_token,
    );
  } catch (error: any) {
    return failure(
      error.status_code,
      error.message,
      error.status,
    );
  }
  // Validate REPL structure
  if (content.files) {
    const fileErrors = validateREPLFiles(content.files);
    if (fileErrors !== null) {
      return failure(404, fileErrors, "FILE_FORMAT_ERROR");
    }
  }
  // If an ID param is supplied then ensure it exists
  const { data } = await db
    .from("repls")
    .select("*")
    .eq("id", request.params.id);

  if (data == null) {
    return failure(
      404,
      "An invalid or unowned REPL ID was supplied",
      "INVALID_REPL_ID"
    );
  }
  const { error } = await db
    .from("repls")
    .update({
      title: content.title ?? data[0].title,
      version: content.version ?? data[0].version,
      user_id: request.session.data.id ?? data[0].user_id,
      labels: content.labels ?? data[0].labels,
      public: content.public ?? data[0].public,
      files: content.files ?? data[0].files,
      updated_at: "NOW()",
      size: content.files
        ? lengthInUtf8Bytes(JSON.stringify(content.files))
        : data[0].size,
    })
    .match({ id: request.params.id });

  if (error !== null) return internalError();
  return success({});
}
