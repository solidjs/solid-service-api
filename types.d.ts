declare;
{
  var ENVIRONMENT: "production" | "development";
  var STYTCH_PROJECT_ID: string;
  var STYTCH_SECRET: string;
  var STYTCH_API: string;
  var STYTCH_URL: string;
  var SUPABASE_URL: string;
  var SUPABASE_KEY: string;
}

type Profile = {
  id: number;
  login: string;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name: string;
  company: string;
  blog: string;
  location: string;
  email: string;
  hireable: boolean;
  bio: string;
  twitter_username: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
};

type REPLFile = {
  main: string;
  content: string[];
};

interface AuthenticatedRequest extends Request {
  session: Session<AuthSession>;
}

type AuthSession = {
  id: string;
  display: string;
  avatar: string;
  github_register: string;
};

type Session<T> = {
  readonly id: string;
  readonly expires_at?: number;
  data: T;
  commit(session: Session<T>, expires_at: number): Promise<string>;
  verify(): Promise<boolean>;
};
