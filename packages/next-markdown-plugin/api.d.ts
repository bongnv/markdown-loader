const getPostBySlug: (
  slug: string,
  fields: string[],
) => Promise<Record<string, any>>;
const getAllPosts: (fields: string[]) => Promise<Record<string, any>[]>;

export default {
  getPostBySlug,
  getAllPosts,
};
