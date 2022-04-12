import { failure, cors, success, createSession } from '../../util';

// Profile route handler
export default async function(request: Request) {
  const session = await createSession<AuthSession>(request, "session");
  // Verify the session
  if (!(await session.verify())) {
    return failure(401, "Unauthenticated");
  }
  const registered = new Date(session.data.github_register);
  const max = new Date('2022-01-07T00:00:42Z');
  return success(
    {
      id: session.data.id,
      display: session.data.display,
      avatar: session.data.avatar,
      github_register: session.data.github_register,
      allowed: registered < max,
    },
    {
      headers: cors(request)
    }
  );
}
