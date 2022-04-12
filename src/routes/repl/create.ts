import { failure, cors, success, createSession, createSupabase, lengthInUtf8Bytes } from '../../util';

// Creates a new REPL
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
  try {
    const { data: repls, error } = await db
      .from('repls')
      .insert([{
        title: content.title,
        version: content.version,
        user_id: session.data.id,
        labels: content.labels,
        data: content.data,
        size: lengthInUtf8Bytes(content.data)
      }], {
        upsert: true
      });
    if (error !== null) {
      console.log(error);
      return failure(400, "InternalError");
    }
    return success(
      { id: repls[0].id },
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
