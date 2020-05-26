declare type getPostBySlug = (
  slug: string,
  fields: string[],
) => Promise<Record<string, any>>;
declare type getAllPosts = (fields: string[]) => Promise<Record<string, any>[]>;

export interface Plugin {
  getPostBySlug: getPostBySlug,
  getAllPosts: getAllPosts,
}
