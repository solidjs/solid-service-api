
export interface Resource {
  title: string;
  link: string;
  author?: string;
  author_url?: string;
  description?: string;
  type: string;
  categories: string[];
  official?: boolean; // If the resource is an official Solid resource
  keywords?: string[];
  published_at?: number;
}

export const ResourceType = {
  Article: 'article',
  Video: 'video',
  Podcast: 'podcast',
  Library: 'library',
  Package: 'package',
}
export const ResourceCategory = {
  Primitives: 'primitive',
  Routers: 'router',
  Data: 'data',
  UI: 'ui',
  Plugins: 'plugin',
  Starters: 'starters',
  BuildUtilities: 'build_utility',
  AddOn: 'add_on',
  Testing: 'testing',
  Educational: 'educational',
}
