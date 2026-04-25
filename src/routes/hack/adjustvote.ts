import { failure, success, createSupabase } from "../../util/util";
import { queryVoteCount, VoteCategory } from "./votes";
import z from "zod";

const validate = z.object({
  category: z.enum(["best_app", "best_ecosystem", "best_student_project"]),
  selection: z.string().max(200).min(3),
});

/**
 * An endpoint allowing users to adjust their hackathon votes
 */
export default async function (
  request: AuthenticatedRequest & {
    content: {
      category: VoteCategory;
      selection: string;
    };
  }
) {
  const content = request.content;
  // Validate the incoming request
  try {
    validate.parse(content);
  } catch (err) {
    return failure(400, "Invalid content supplied");
  }
  const registered = new Date(request.session.data.github_register);
  const max = new Date("2022-01-07T00:00:42Z");

  // Disallow users registered after the competition start
  if (registered > max) {
    return failure(400, "Registration date.");
  }

  // Toggle the vote in the database
  const db = createSupabase();
  const votes = await queryVoteCount(request.session.data.id, db);
  const bucket = votes[content.category];
  // Insert the vote
  if (!bucket.selections.includes(content.selection)) {
    // Ensure the user isn't over voting
    if (bucket.selections.length >= bucket.total) {
      return failure(400, "Maximum votes reached.");
    }
    await db.from("solidhack_votes").insert([
      {
        user_id: request.session.data.id,
        category: content.category,
        selection: content.selection,
      },
    ]);
    bucket.selections.push(content.selection);
    // Remove the vote
  } else {
    await db
      .from("solidhack_votes")
      .delete()
      .eq("user_id", request.session.data.id)
      .eq("category", content.category)
      .eq("selection", content.selection);
    const position = bucket.selections.indexOf(content.category);
    bucket.selections.splice(position);
  }
  return success(votes);
}
