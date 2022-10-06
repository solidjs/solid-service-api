import {
  failure,
  success,
  createSupabase,
  lengthInUtf8Bytes,
} from "../../util/util";
import { validateREPLFiles } from ".";
import generateToken from "../../util/token";

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
  const anonymous = request.session ? true : false;
  let write_token;
  let user_id;
  // Set user value or lookup token if anonymous REPL
  if (anonymous) {
    user_id = request.session.data.id;
  } else {
    write_token = generateToken(100);
  }
  const content = request.content;
  // Basic file validation
  const fileErrors = validateREPLFiles(content.files);
  if (fileErrors !== null) {
    return failure(404, fileErrors, "FILE_FORMAT_ERROR");
  }
  const db = createSupabase();
  const { data: repls, error } = await db.from("repls").insert([
    {
      user_id,
      title: content.title,
      version: content.version,
      labels: content.labels,
      public: content.public,
      files: content.files,
      write_token,
      size: lengthInUtf8Bytes(JSON.stringify(content.files)),
    },
  ]);
  if (error !== null) {
    console.log(error);
    return failure(404, "Internal or unknown error detected", "INTERNAL_ERROR");
  }
  return success({ id: repls[0].id, write_token });
}
