import { Router } from "itty-router";
import { withContent } from "itty-router-extras";
import { handleOptions, withAuth, withOptionalAuth } from "./util";

import login from "./routes/auth/login";
import profile from "./routes/auth/profile";
import authorize from "./routes/auth/authorize";

// import votes from "./routes/hack/votes";
// import adjustvote from "./routes/hack/adjustvote";

import createRepl from "./routes/repl/create";
import updateRepl from "./routes/repl/update";
import listRepls from "./routes/repl/list";
import deleteRepl from "./routes/repl/delete";
import getRepl from "./routes/repl/get";
import listSolidex from "./routes/solidex/list";
import submitSolidex from "./routes/solidex/submit";

import status from "./routes/status";

const router = Router();

// Routes
router.get("/profile", withAuth, profile);
router.get("/auth/login", login);
router.get("/auth/callback", authorize);

// REPL
router.get("/repl/:id", withOptionalAuth, withContent, getRepl);
router.get("/repl", withAuth, listRepls);
router.put("/repl/:id", withAuth, withContent, updateRepl);
router.post("/repl", withAuth, withContent, createRepl);
router.delete("/repl/:id", withAuth, deleteRepl);

// Solidex
router.get("/solidex/:type", listSolidex);
router.post("/solidex", submitSolidex);
// router.post("/hack/votes", withAuth, withContent, adjustvote);

// SolidHack
// router.get("/hack/votes", withAuth, votes);
// router.post("/hack/votes", withAuth, withContent, adjustvote);

router.get("/status", status);
router.all("*", status);

addEventListener("fetch", (event: FetchEvent) => {
  if (event.request.method === "OPTIONS") {
    return event.respondWith(handleOptions(event.request));
  }
  return event.respondWith(router.handle(event.request));
});
