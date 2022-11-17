import {
  failure,
  success,
  createSupabase,
  lengthInUtf8Bytes,
  internalError,
} from "../../util/util";
import { decompressFromURL } from "@amoutonbrady/lz-string";
import { v4 as uuid } from "uuid";
import z from "zod";

const ID = z.string().uuid();

// Build the invalid resposnse message
const invalidItem = () =>
  failure(404, "An invalid or unowned REPL ID was supplied", "INVALID_REPL_ID");

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
  // If the ID is not a UUID then it's likely a legacy hash, attempt
  // to request from legacy worker, parse and output it.
  const parseUuid = ID.safeParse(request.params.id);
  if (!parseUuid.success) {
    return await handleLegacyRepl(request.params.id);
  }
  const db = createSupabase();
  const user_id = request.session ? request.session.data.id : "null";
  const { data: repls, error } = await db
    .from("repls")
    .select(
      "id,user_id,title,labels,public,version,size,files,created_at,updated_at"
    )
    .eq("id", request.params.id)
    .is("deleted_at", null)
    .or(`public.eq.true,user_id.eq.${user_id}`);

  if (error !== null) return internalError();
  if (repls.length == 0 || repls === null) return invalidItem();
  return success(repls[0]);
}

// Handles requesting legacy REPL values from the proxy and merging into
// new Supabase dataset. Note that this method is meant to be removed within
// 6 months. This is a temporary stop-gap solution between KV and Supabase.
const handleLegacyRepl = async (id: string) => {
  // Find related REPL before proxying to the user
  const db = createSupabase();
  const { data: repls, error } = await db
    .from("repls")
    .select(
      "id,user_id,title,labels,public,version,size,files,created_at,updated_at"
    )
    .eq("guid", id)
    .is("deleted_at", null)
    .or(`public.eq.true`);

  if (error === null && repls.length !== 0) {
    return success(repls[0]);
  }

  // Retrieve REPL from legacy worker cache
  const body = await fetch(
    `https://workers-kv-migrate.pilotio.workers.dev?id=${id}`
  );
  if (body.status !== 200) {
    return invalidItem();
  }
  const json: { version: string; data: string } = await body.json();
  const decompressed = JSON.parse(decompressFromURL(json.data)!);
  const files = (decompressed || []).map(
    (file: { name: string; source: string, type: string }) => {
      return {
        name: `${file.name}.${file.type}`,
        content: file.source,
      };
    }
  );
  let payload = {
    id: uuid(),
    title: "Imported legacy REPL",
    guid: id,
    labels: ["legacy"],
    user_id: null,
    public: true,
    version: json.version,
    size: lengthInUtf8Bytes(JSON.stringify(json.data)),
    files,
    created_at: new Date(),
    updated_at: null,
  };
  // Load the record into the cache
  const { error: insertError } = await db.from("repls").insert([payload]);
  if (insertError !== null) return internalError();
  return success(payload);
};
