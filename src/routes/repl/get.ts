import { failure, success, createSupabase, lengthInUtf8Bytes } from "../../util/util";
import { decompressFromURL } from '@amoutonbrady/lz-string';
import z from "zod";

const ID = z.string().uuid();

// Build the invalid resposnse message
const invalidItem = failure(
  404,
  "An invalid or unowned REPL ID was supplied",
  "INVALID_REPL_ID"
);

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
  const db = createSupabase();
  const user_id = request.session ? request.session.data.id : "null";
  
  // If the ID is not a UUID then it's likely a legacy hash, attempt
  // to request from legacy worker, parse and output it.
  const parseUuid = ID.safeParse(request.params.id);
  if (!parseUuid.success) {
    const body = await fetch(`https://workers-kv-migrate.pilotio.workers.dev?id=${request.params.id}`);
    if (body.status !== 200) {
      return invalidItem;
    }
    const json: { version: string, data: string} = await body.json();
    const decompressed = JSON.parse(decompressFromURL(json.data)!);
    const files = (decompressed || []).map((file: { name: string, source: string }) => {
      return {
        name: file.name,
        content: file.source
      };
    });
    return success({
      id: request.params.id,
      title: 'Imported from legacy platform',
      labels: [],
      user_id: null,
      public: true,
      version: json.version,
      size: lengthInUtf8Bytes(JSON.stringify(json.data)),
      created_at: null,
      updated_at: null,
      files
    });
  }
  const { data: repls, error } = await db
    .from("repls")
    .select(
      "id,user_id,title,labels,public,version,size,files,created_at,updated_at"
    )
    .eq('id',request.params.id)
    .is("deleted_at", null)
    .or(`public.eq.true,user_id.eq.${user_id}`);

  if (error !== null) {
    return failure(404, "Internal or unknown error detected", "INTERNAL_ERROR");
  }
  if (repls.length == 0 || repls === null) {
    return invalidItem;
  }
  return success(repls[0]);
}
