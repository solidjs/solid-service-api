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
  "content": "import { createSignal, onCleanup } from \"solid-js\";\r\nimport { render } from \"solid-js\/web\";\r\n\r\nconst CountingComponent = () => {\r\n\tconst [count, setCount] = createSignal(0);\r\n\tconst interval = setInterval(\r\n\t\t() => setCount(c => c + 1),\r\n\t\t1000\r\n\t);\r\n\tonCleanup(() => clearInterval(interval));\r\n\treturn <div>Count value is {count()}<\/div>;\r\n};\r\n\r\nrender(() => <CountingComponent \/>, document.getElementById(\"app\"));"
}
```

The REPL endpoint supports authenticated REPL and anonymous creation. Since anonymous REPLs have no user associated this API issues a special token keyed to the REPL record. This token is only issued on record creation and can never be retrieved afterwards. The token is to be supplied during update/patching of the REPL record in the future.

#### List [GET] /repl?{&limit}{&offset}{&asc}

#### List User REPLs [GET] /repl/[:githubHandle]/?{&limit}{&offset}{&asc}

Returns a list of REPLs owned by the current user. The endpoint is paginated and can potentially support filters. The List and List User REPLs endpoints work the same. If the user requests/repl/davedbase it will show only that users public list.

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

Creates a new REPL record for the user. The REPL creation endpoint supports anonymous content as well. When a user token isn't supplied the service will create the record without any user association and return a `write_token` property. This may be used in place of the Bearer token in the `PATCH` and `PUT` endpoints.

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

#### Transfer [POST] /repl/[:id]/transfer

Transfers a REPL from one user to another. Transfers of anonymous REPLs are also by supplying a write_token. The following example shows a request with a token.

Request:

```json
{
  "write_token": "...."
}
```

Response:

```json
{}
```

#### Update [PUT] /repl/[:id]

Update a new REPL record for the user. This endpoint accepts `write_token` in the body in place of the Bearer token if an anonymous REPL is to be edited. This token is issued on REPL creation.

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

### Solidex

#### List [GET] /solidex/[:type]

Retrieves a full list of Solid ecosystem packages. The type property can currently be `packages` or `resources`.

```json
[
  {
    "author": "Maksim Ivanov",
    "author_url": "https://www.youtube.com/user/satansdeer1",
    "categories": ["educational"],
    "description": "Maksim Ivanov walks us through Solid.js and how to use it.",
    "keywords": [""],
    "link": "https://www.youtube.com/watch?v=wu6HvLoi9VQ",
    "published_at": 1628532062000,
    "title": "How To Convert React Application To SolidJS",
    "type": "video"
  }
]
```

#### Submit [GET] /solidex

Allows an external user to submit a new Solidex entry for approval. This endpoint is not fully complete and will return only dummy data. It's request body looks like the following, it's return result should be a record UUID.

```json
{
  "author": "Maksim Ivanov",
  "author_url": "https://www.youtube.com/user/satansdeer1",
  "categories": ["educational"],
  "description": "Maksim Ivanov walks us through Solid.js and how to use it.",
  "keywords": [""],
  "link": "https://www.youtube.com/watch?v=wu6HvLoi9VQ",
  "published_at": 1628532062000,
  "title": "How To Convert React Application To SolidJS",
  "type": "video"
}
```

## Changelog

### Version 1.0.1 (April 15, 2022)

- Ability to have public/private REPL storage
- Added validation for REPL file format (based on our original .json structure)
- Adjusted get endpoint to return public REPL without auth token

### Version 1.0.9 (October 6, 2022)

- Added anonymous REPL creation + write_token for patch and update

### Version 1.0.10 (October 15, 2022)

- Improved error responses for invalid token/user on write update/patch
- Added REPL transfer mechanism

## TO-Do & Ideas

- [x] Add better validation for certain endpoints
- [x] Parse and validate REPLs with more granular detail (refer to Solid REPL output)
- [x] Private/public mode for REPL
- [x] Retrieve public REPLs
- [x] Add endpoint for requesting other user REPLs
- [x] Anonymous REPL creation
- [x] Transfer REPLs between users
- [ ] Handle request where application/json isn't sent as body type
- [ ] Make REPL searchable
- [ ] Add revision history and ability to retrieve
- [ ] Add ability to fork a REPL
- [ ] Enable user blocking options
- [ ] Add ability to save REPL to a gist
- [ ] Add ability to create a repository of an example
- [ ] Move REPL packaging and zipping to the API

## Contributors

A special thank you to to Christian Hansen [ch99q](https://github.com/ch99q) for initially setting up the foundations of this project and sorting out the Stytch integration. A big thank you to M. Bagher Abiat [Aslemammad](https://github.com/Aslemammad) who made vite-plugin-cloudflare which is one of the best utilities we've seen for working with Cloudflare.
