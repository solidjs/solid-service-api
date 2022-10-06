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
  const fileErrors = validateREPLFiles(content.files);
  if (fileErrors !== null) {
    return failure(404, fileErrors, "FILE_FORMAT_ERROR");
  }
  const anonymous = request.session ? true : false;
  let user_id, lookup_key, lookup_value;
  // Override lookup value if anon or a user
  if (!anonymous) {
    lookup_key = "write_token";
    lookup_value = content.write_token;
  } else {
    user_id = request.session.data.id;
    lookup_key = "user_id";
    lookup_value = user_id;
  }
  const db = createSupabase();
  // If an ID param is supplied then ensure it exists
  const { count } = await db
    .from("repls")
    .select("*", { count: "exact" })
    .eq("id", request.params.id)
    .eq(lookup_key, lookup_value);

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
      user_id: user_id,
      labels: content.labels,
      public: content.public,
      files: content.files,
      updated_at: "NOW()",
      size: lengthInUtf8Bytes(JSON.stringify(content.files)),
    })
    .match({ id: request.params.id });

  if (error !== null) {
    console.log(error);
    return internalError();
  }
  return success({});
}
