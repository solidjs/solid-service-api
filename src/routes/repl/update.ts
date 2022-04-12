import { failure, cors, success, createSession, createSupabase, lengthInUtf8Bytes } from '../../util';

// Updates a new REPL
export default async function(request: Request & {
  content: {
    title: string;
    labels: string[];
    version: string;
    data: string;
  };
  params: {
    id: string;
  }
}) {
  const session = await createSession<AuthSession>(request, "session");
  const content = request.content;
  if (!(await session.verify())) {
    return failure(401, "Unauthenticated");
  }
  const db = createSupabase();
  
  // If an ID param is supplied then ensure it exists
  const { count } = await db
    .from('repls')
    .select('*', { count: 'exact' })
    .eq('id', request.params.id);
  if (count == 0) {
    return failure(404, "InvalidID");
  }
  try {
    const { error } = await db
      .from('repls')
      .insert([{
        id: request.params.id,
        title: content.title,
        version: content.version,
        user_id: session.data.id,
        labels: content.labels,
        data: content.data,
        updated_at: "NOW()",
        size: lengthInUtf8Bytes(content.data)
      }], { upsert: true });
    if (error !== null) {
      console.log(error);
      return failure(400, "InternalError");
    }
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
