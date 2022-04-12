
import { Router } from 'itty-router';
import { withContent } from 'itty-router-extras';
import { handleOptions } from './util';

import login from './routes/auth/login';
import profile from './routes/auth/profile';
import authorize from './routes/auth/authorize';

import votes from './routes/hack/votes';
import adjustvote from './routes/hack/adjustvote';

import createRepl from './routes/repl/create';
import updateRepl from './routes/repl/update';
import listRepls from './routes/repl/list';
import deleteRepl from './routes/repl/delete';
import getRepl from './routes/repl/get';

declare global {
  var ENVIRONMENT: "production" | "development";
  var STYTCH_PROJECT_ID: string;
  var STYTCH_SECRET: string;
  var STYTCH_API: string;
  var STYTCH_URL: string;
  var SUPABASE_URL: string;
  var SUPABASE_KEY: string;
}

const router = Router();

// Routes
router.get('/profile', profile);
router.get('/auth/login', login);
router.get('/auth/callback', authorize);

// REPL
router.get('/repl/:id', withContent, getRepl);
router.get('/repl', listRepls);
router.put('/repl/:id', withContent, updateRepl);
router.post('/repl', withContent, createRepl);
router.delete('/repl/:id', deleteRepl);

// SolidHack
router.get('/hack/votes', votes);
router.post('/hack/votes', withContent, adjustvote);

router.all('*', () => new Response('Oops. Nothing here silly.', { status: 404 }))

addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.method === "OPTIONS") {
    return event.respondWith(handleOptions(event.request));
  }
  return event.respondWith(router.handle(event.request))
})
