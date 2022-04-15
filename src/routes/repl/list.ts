import { failure, success, createSupabase } from "../../util";

type CreateREPL = {
  title: string;
  labels: string[];
  data: string;
};

// Lists all available repls
export default async function (
  request: AuthenticatedRequest & {
    content: CreateREPL;
  }
) {
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit");
  const offset = url.searchParams.get("offset");
  const ascending = url.searchParams.get("asc");

  // Count the listings
  const db = createSupabase();
  const { count } = await db
    .from("repls")
    .select("*", { count: "exact" })
    .eq("user_id", request.session.data.id)
    .is("deleted_at", null);

  const { data: repls, error } = await db
    .from("repls")
    .select("id,title,public,labels,files,version,size,created_at,updated_at")
    .eq("user_id", request.session.data.id)
    .range(offset ? parseInt(offset) : 0, limit ? parseInt(limit) : 25)
    .order("created_at", { ascending: ascending ? true : false })
    .is("deleted_at", null);

  if (error !== null) {
    console.log(error);
    return failure(404, "Internal or unknown error detected", "INTERNAL_ERROR");
  }
  return success({
    total: count,
    list: repls,
  });
}
