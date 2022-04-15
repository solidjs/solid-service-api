import {
  failure,
  success,
  createSupabase,
  lengthInUtf8Bytes,
} from "../../util";
import { validateREPLFiles } from ".";

/**
 * Creates a new REPL for the user and replies with the ID.
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
  const content = request.content;
  // Basic file validation
  const fileErrors = validateREPLFiles(content.files);
  if (fileErrors !== null) {
    return failure(404, fileErrors, "FILE_FORMAT_ERROR");
  }
  const db = createSupabase();
  const { data: repls, error } = await db.from("repls").insert([
    {
      title: content.title,
      version: content.version,
      user_id: request.session.data.id,
      labels: content.labels,
      public: content.public,
      files: content.files,
      size: lengthInUtf8Bytes(JSON.stringify(content.files)),
    },
  ]);
  if (error !== null) {
    return failure(404, "Internal or unknown error detected", "INTERNAL_ERROR");
  }
  return success({ id: repls[0].id });
}
