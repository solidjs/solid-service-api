import { failure, success } from "../../util/util";
import { z } from "zod";
import { Octokit } from "@octokit/core";
import { ResourceType, ResourceCategory } from "./types";
import { createPullRequest } from "octokit-plugin-create-pull-request";

interface GithubFileStructure {
  content: string;
  encoding: BufferEncoding;
}

// Add the PR plugin to Octokit
const OctokitWithPlugin = Octokit.plugin(createPullRequest);

// Validation sets
const submission = z.object({
  link: z.string().url(),
  title: z.string().max(200),
  description: z.string(),
  author: z.string().max(100),
  author_url: z.string().url().optional(),
  keywords: z.array(z.string()).max(10).min(3),
  type: z.enum(["article", "video", "podcast", "package"]),
  official: z.boolean(),
  categories: z.array(z.enum([
    "primitive",
    "router",
    "data",
    "ui",
    "plugin",
    "starters",
    "build_utility",
    "add_on",
    "testing",
    "educational"
  ])),
  published_at: z.number(),
});

// Lists all available repls
export default async function (
  request: AuthenticatedRequest & {
    content: {
      title: string;
      link: string;
      author: string;
      author_url: string;
      description: string;
      type: typeof ResourceType;
      categories: typeof ResourceCategory[];
      keywords: string[];
      official: boolean;
      published_at: number;
    };
  }
) {
  // Perform validations
  try {
    submission.parse(request.content);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return failure(404, err.issues, "VALIDATION_ERROR");
    }
  }
  // Handle inserting the submission
  const files = {
    [`resources/${request.content.type}s.ts`]: (file: GithubFileStructure) => {
      // @TODO: Determine a safe way to add the submission to the TS file
    const content = file.content;
      return Buffer.from(content, file.encoding)
        .toString("utf-8")
        .toUpperCase();
    },
  };
  const octokit = new OctokitWithPlugin({
    auth: GITHUB_TOKEN,
  });
  const pr = await octokit.createPullRequest({
    owner: "solidjs",
    repo: "solidex",
    title: `${request.content.type} Submission: ${request.content.title}`,
    body: "This pull request was submitted via the Solid Site request form.",
    base: "main",
    head: "pull-request-branch-name",
    changes: [
      {
        files,
        commit: `Adding ${request.content.title} submission to filesets`,
      },
    ],
  });
  if (pr == null) {
    return failure(
      404,
      "Could not complete sending your submission",
      "INTERNAL_ERROR"
    );
  }
  return success(pr);
}
