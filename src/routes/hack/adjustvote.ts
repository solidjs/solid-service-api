import { failure, cors, success, createSession, createSupabase } from '../../util';
import { queryVoteCount } from './votes';
import z from 'zod';

const validate = z.object({
  category: z.enum([
    'best_app',
    'best_ecosystem',
    'best_student_project'
  ]),
  selection: z.string().max(200).min(3)
});

// Adjusts a SolidHack vote
export default async function(request: Request & {
  content: {
    category: string;
    selection: string
  }
}) {
  const session = await createSession<AuthSession>(request, "session");
  const content = request.content;
  if (!(await session.verify())) {
    return failure(401, "Unauthenticated");
  }
  // Validate the incoming request
  try {
    validate.parse(content);
  } catch(err) {
    return failure(400, 'Invalid content supplied');
  }
  const registered = new Date(session.data.github_register);
  const max = new Date('2022-01-07T00:00:42Z');

  // Disallow users registered after the competition start
  if (registered > max) {
    return failure(400, 'Registration date.');
  }

  // Toggle the vote in the database
  const db = createSupabase();
  const votes = await queryVoteCount(
    session.data.id,
    db
  );
  // Insert the vote
  if (!votes[content.category].selections.includes(content.selection)) {
    // Ensure the user isn't over voting
    if (votes[content.category].selections.length >= votes[content.category].total) {
      return failure(400, 'Maximum votes reached.');
    }
    await db
      .from('solidhack_votes')
      .insert([{
        user_id: session.data.id,
        category: content.category,
        selection: content.selection
      }]);
      votes[content.category].selections.push(
        content.selection
      );
  // Remove the vote
  } else {
    await db
      .from('solidhack_votes')
      .delete()
      .eq('user_id', session.data.id)
      .eq('category', content.category)
      .eq('selection', content.selection);
    const position = votes[content.category].selections.indexOf(content.category);
    votes[content.category].selections.splice(
      position
    );
  }
  return success(
    votes,
    {
      headers: {
        ...cors(request),
      },
    }
  );
}
