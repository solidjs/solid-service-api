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
  const { count, error } = await db
    .from('repls')
    .select('*', { count: 'exact' })
    .eq('id', request.params.id)
    .is('deleted_at', null);
  if (count == 0) {
    console.log(error);
    return failure(404, "InvalidID");
  }
  try {
    // Soft delete the record
    await db
      .from('repls')
      .update({ deleted_at: "NOW()" })
      .eq('id', request.params.id);
    return success(
      {},
      {
        headers: {
          ...cors(request),
        },
      }
    );
  } catch(err) {
    return failure(400, "InternalError");
  }
}
