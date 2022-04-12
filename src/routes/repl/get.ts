import { failure, cors, success, createSession, createSupabase } from '../../util';

// Marks a REPL as deleted
export default async function(request: Request & {
  params: {
    id: string;
  }
}) {
  const session = await createSession<AuthSession>(request, "session");
  if (!(await session.verify())) {
    return failure(401, "Unauthenticated");
  }
  const db = createSupabase();

  // Check if the record exists
  const { data: repls, error } = await db
  .from('repls')
  .select('id,title,labels,data,version,size,created_at,updated_at')
  .eq('id', request.params.id)
  .is('deleted_at', null);
  if (error !== null) {
    return failure(404, "InternalError");
  }
  if (repls === null) {
    return failure(404, "InvalidID");
  }
  return success(
    repls[0],
    {
      headers: {
        ...cors(request),
      },
    }
  );
}
