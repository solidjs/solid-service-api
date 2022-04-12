import { failure, cors, success, createSession, createSupabase } from '../../util';

type CreateREPL = {
  title: string;
  labels: string[];
  data: string;
};

// Lists all available repls
export default async function(request: Request & {
  content: CreateREPL
}) {
  const session = await createSession<AuthSession>(request, "session");
  if (!(await session.verify())) {
    return failure(401, "Unauthenticated");
  }
  const db = createSupabase();
  try {
    const { data: repls, error } = await db
      .from('repls')
      .select('id,title,labels,data,version,size,created_at,updated_at')
      .eq('user_id', session.data.id)
      .is('deleted_at', null);
    if (error !== null) {
      return failure(400, "InternalError");
    }
    return success(
      repls,
      {
        headers: {
          ...cors(request),
        },
      }
    );
  } catch(err) {
    console.log(err)
    return failure(400, "InternalError");
  }
}
