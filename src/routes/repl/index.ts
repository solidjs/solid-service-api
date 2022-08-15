import z, { ZodIssue } from "zod";

const File = z.array(
  z.object({
    name: z.string().min(3).max(50),
    content: z.string(),
  })
);

/**
 * Parses a list of incoming REPL files if they are valid or not.
 *
 * @param files {Array<REPLFile>} A list of REPL files.
 * @returns Returns a list of Zod formatted issues
 */
export function validateREPLFiles(files: REPLFile[]): ZodIssue[] | null {
  const data = File.safeParse(files);
  if (!data.success) {
    return data.error.issues;
  }
  return null;
}
