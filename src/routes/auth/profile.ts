import { failure, success } from "../../util/util";

/**
 * Decodes session information and replies with current user's profile.
 */
export default async function (request: AuthenticatedRequest) {
  // Verify the session
  if (!(await request.session.verify())) {
    return failure(401, "Unauthenticated request, please supply a valid user token.", "UNAUTHORIZED_ACCESS");
  }
  const registered = new Date(request.session.data.github_register);
  const max = new Date("2022-01-07T00:00:42Z");
  return success({
    id: request.session.data.id,
    display: request.session.data.display,
    avatar: request.session.data.avatar,
    github_register: request.session.data.github_register,
    allowed: registered < max,
  });
}
