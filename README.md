<p>
  <img width="100%" src="https://assets.solidjs.com/banner?project=Service%20API&type=core" alt="Solid Service API">
</p>

# Solid Service API

The Service API runs at api.solidjs.com and acts as a central datastore for critical SolidJS.com and supporting service operations. The API srevices REPL, SolidHack and has a general authentication system using GitHub OAuth powered by the wonderful folks at Stytch.

Our services runs on Cloudflare Workers. The following code base is meant to be minimal and extendable. This is a high-throughput services so keeping is

## Development

### Dependencies

1. Stytch API
2. Supabase JS API & Client
3. Cloudflare Workers

### Install

1. Clone the project locally: `git clone https://github.com/solidjs/solid-service-api`
2. Change directory into your local copy: `cd solid-service-api`
3. Install the dependencies: `yarn install`

### Available commands

- `yarn install`: Install the dependencies
- `yarn dev`: Start the dev server using Miniflare
- `yarn build`: Builds the entire package using vite-plugin-cloudflare
- `yarn format`: Format the whole project with prettier
- `yarn deploy`: Deploys the service via Wrangler

### Environment Setup

In order to run the API successfully you'll need to setup a local .env file with the necessary configuration details. The following env should be copy and pasted into the root then populated with proper credentials:

```
STYTCH_PROJECT_ID=
STYTCH_SECRET=
STYTCH_API=
STYTCH_URL=
ENVIRONMENT=
SUPABASE_URL=
SUPABASE_KEY=
```

Once that's done you should be able to run `yarn dev` to initialize the service locally with Miniflare.

## Authentication

The API uses a Bearer token to authenticate secure endpoints. Once you complete the login process and retain a JWT token (see login) all further requests to the API should contained the `Authorization` hearer with `Bearer [jwt token]`. The JWT is signed with our Stytch secret. The JWT is encoded with a minimal amount of user information.

## Errors

The API endpoints use standard HTTP status codes for errors and a consistent error response structure:

```json
{
  "status_code": "SOME_ERROR",
  "status_message": "A descriptive error response."
}
```

## Endpoints

The following is an outline of endpoints that the service provides. Note that you may find a Postman collection set in the root of the directory. This should help with quickly getting setup and making calls

### Auth

#### [GET] /auth/login?redirect=[...]

This endpoint is used to trigger the OAuth login process. A redirect querystring value is necessary to ensure the user is sent back to the current location. You should link a user directly to this endpoint which will in turn redirect to Stytch for GitHub authentication, back to the authorize callback endpoint and then finally to the redirect path in the query. The querystring of the last redirect will contain a token value with a JWT for accessing this service.

#### [GET] /auth/profile

Retrieves the current users profile and responds with basic information:

```json
{
  "id": "MDQ6VsdfklcjExNjgzOTc=",
  "display": "foobar",
  "avatar": "https://avatars.githubusercontent.com/u/9277648?v=4",
  "github_register": "2010-11-02T21:13:42Z"
}
```

### REPL

This REPL collection enables endpoints to manage repl listings and powers the Solid Playground. REPL records have a set of basic information: `REPL data`, `labels`, `Solid version`, `size in bytes`, `creation date` and `updated date`.

Note that the following API uses a constant structure for describing a REPL file. It uses the following shape:

```ts
{
  "name": "main.tsx",
  "content": [
    "import { createSignal, onCleanup } from \"solid-js\";",
    "import { render } from \"solid-js/web\";",
    ...
  ]
}
```

#### List [GET] /repl?{&limit}{&offset}{&asc}

Returns a list of REPLs owned by the current user. The endpoint is paginated and can potentially support filters.

```json
{
  "total": 1,
  "list": [
    {
      "id": "77aa5eec-19bd-471c-8b49-bd11a07c6544",
      "title": "Counter Example",
      "labels": ["examples", "basic"],
      "files": [],
      "version": "1.0",
      "public": true,
      "size": 54,
      "created_at": "2022-04-13T15:09:54.671307+00:00",
      "updated_at": null
    }
  ]
}
```

#### Create [POST] /repl

Creates a new REPL record for the user.

Request:

```json
{
  "title": "Counter Example",
  "version": "1.0",
  "labels": ["examples", "basic"],
  "files": []
}
```

Response:

```json
{
  "id": "77aa5eec-19bd-471c-8b49-bd11a07c6547"
}
```

#### Update [PUT] /repl/[:id]

Update a new REPL record for the user.

Request:

```json
{
  "title": "Counter Example",
  "version": "1.0",
  "public": true,
  "labels": ["examples", "basic"],
  "files": []
}
```

Response:

```json
{
  "id": "77aa5eec-19bd-471c-8b49-bd11a07c6547"
}
```

#### Retrieve [GET] /repl/[:id]

Retrieves a REPL based on the UUID.

```json
{
  "title": "Counter Example",
  "user_id": "DDQ6VDKNlcjExNjgzOTc=",
  "version": "1.0",
  "labels": ["examples", "basic"],
  "public": true,
  "files": [],
  "created_at": "2022-04-15T16:41:24.918092+00:00",
  "updated_at": null
}
```

#### Delete [DELETE] /repl/[:id]

Delets a REPL based on the UUID. Successful deletions will return a status 200. Note that the service uses soft deletes. They are not retrievable via the API but are marked in the database itself.

## Changelog

### Version 1.0.1 (April 15, 2022)

- Ability to have public/private REPL storage
- Added validation for REPL file format (based on our original .json structure)
- Adjusted get endpoint to return public REPL without auth token

## TO-Do & Ideas

- [x] Add better validation for certain endpoints
- [x] Parse and validate REPLs with more granular detail (refer to Solid REPL output)
- [x] Private/public mode for REPL
- [x] Retrieve public REPLs
- [ ] Add revision history and ability to retrieve
- [ ] Add ability to fork a REPL
- [ ] Enable user blocking options
- [ ] Add ability to save REPL to a gist
- [ ] Add ability to create a repository of an example

## Contributors

A special thank you to to Christian Hansen [ch99q](https://github.com/ch99q) for initially setting up the foundations of this project and sorting out the Stytch integration. A big thank you to M. Bagher Abiat [Aslemammad](https://github.com/Aslemammad) who made vite-plugin-cloudflare which is one of the best utilities we've seen for working with Cloudflare.
