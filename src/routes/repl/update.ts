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
  // Basic file validation
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
  const fileErrors = validateREPLFiles(content.files);
  if (fileErrors !== null) {
    return failure(404, fileErrors, "FILE_FORMAT_ERROR");
  }
  const { error } = await db
    .from("repls")
    .update({
      title: content.title,
      version: content.version,
      labels: content.labels,
      public: content.public,
      files: content.files,
      updated_at: "NOW()",
      size: lengthInUtf8Bytes(JSON.stringify(content.files)),
    })
    .match({ id: request.params.id });

  if (error !== null) internalError();
  return success({});
}
