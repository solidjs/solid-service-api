import { failure, success, createSession, createSupabase } from "../../util";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Determines the vote count for the current user.
 *
 * @param user_id {string} User identifier
 * @param db {SupebaseClient} Database client to use
 * @returns {object} Structured vote information
 */
export async function queryVoteCount(user_id: string, db: SupabaseClient) {
  const { data } = await db
    .from("solidhack_votes")
    .select("category,selection")
    .eq("user_id", user_id);

  return data?.reduce(
    (memo, row) => {
      memo[row.category].selections.push(row.selection);
      return memo;
    },
    {
      best_student_project: {
        total: 3,
        selections: [],
      },
      best_app: {
        total: 3,
        selections: [],
      },
      best_ecosystem: {
        total: 3,
        selections: [],
      },
    }
  );
}

/**
 * Queries the users current vote count.
 */
export default async function votes(request: Request) {
  const session = await createSession<AuthSession>(request, "session");
  // Verify the session
  if (!(await session.verify())) {
    return failure(401, "Unauthenticated");
  }
  const votes = await queryVoteCount(session.data.id, createSupabase());
  return success(votes);
}
