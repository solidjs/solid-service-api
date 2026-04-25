import { Router } from "itty-router";
import { withContent } from "itty-router-extras";
import { handleOptions, withAuth, withOptionalAuth } from "./util/util";

import login from "./routes/auth/login";
import profile from "./routes/auth/profile";
import authorize from "./routes/auth/authorize";

// import votes from "./routes/hack/votes";
// import adjustvote from "./routes/hack/adjustvote";

import createRepl from "./routes/repl/create";
import updateRepl from "./routes/repl/update";
import listRepls from "./routes/repl/list";
import deleteRepl from "./routes/repl/delete";
import transferRepl from "./routes/repl/transfer";
import getRepl from "./routes/repl/get";
import patchRepl from "./routes/repl/patch";
import listSolidex from "./routes/solidex/list";
import linksSolidex from "./routes/solidex/links";
import submitSolidex from "./routes/solidex/submit";

import status from "./routes/status";

const router = Router();

// Routes
router.get("/profile", withAuth, profile);
router.get("/auth/login", login);
router.get("/auth/callback", authorize);

// REPL
router.get("/repl/:id", withOptionalAuth, withContent, getRepl);
router.get("/repl/:user/list", listRepls);
router.get("/repl", withAuth, listRepls);
router.put("/repl/:id", withOptionalAuth, withContent, updateRepl);
router.post("/repl/:id/transfer", withAuth, withContent, transferRepl);
router.patch("/repl/:id", withOptionalAuth, withContent, patchRepl);
router.post("/repl", withOptionalAuth, withContent, createRepl);
router.delete("/repl/:id", withAuth, deleteRepl);

// Solidex
router.get("/solidex/links", linksSolidex);
router.get("/solidex/:type", listSolidex);
router.post("/solidex", withContent, submitSolidex as any);

// SolidHack
// router.get("/hack/votes", withAuth, votes);
// router.post("/hack/votes", withAuth, withContent, adjustvote);

router.get("/status", status);
router.all("*", status);

export default {
  fetch(request: Request, env: Record<string, unknown>) {
    // Expose environment variables on globalThis to preserve the existing
    // service-worker-era access pattern (e.g. STYTCH_API, SUPABASE_URL).
    Object.assign(globalThis, env);
    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }
    return router.fetch(request);
  },
};
