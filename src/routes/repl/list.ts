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
    params: {
      user?: string;
    }
  }
) {
  let id;
  let publicValues = '(true,false)';
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit");
  const offset = url.searchParams.get("offset");
  const ascending = url.searchParams.get("asc");
  const userHandle = request.params.user;

  // Count the listings
  const db = createSupabase();

  // Handle the case where a user param is supplied
  if (userHandle) {
    const { data: users, error } = await db
      .from("users")
      .select("id")
      .eq("profile->>login", userHandle);
    if (error || users.length == 0) {
      return failure(404, "Invalid user specified", "INVALID_USER");
    }
    id = users[0].id;
    publicValues = '(true)';
  } else {
    id = request.session.data.id;
  }

  const { count } = await db
    .from("repls")
    .select("*", { count: "exact" })
    .eq("user_id", id)
    .is("deleted_at", null);

  const { data: repls, error } = await db
    .from("repls")
    .select("id,title,public,labels,files,version,size,created_at,updated_at")
    .eq("user_id", id)
    .range(offset ? parseInt(offset) : 0, limit ? parseInt(limit) : 25)
    .order("created_at", { ascending: ascending ? true : false })
    .is("deleted_at", null)
    .filter('public', 'in', publicValues);

  if (error !== null) {
    return failure(404, "Internal or unknown error detected", "INTERNAL_ERROR");
  }
  return success({
    total: count,
    list: repls,
  });
}
