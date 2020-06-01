declare module "@content/api" {
  declare const API: {
    getPostBySlug: (
      slug: string,
      fields: string[],
    ) => Promise<Record<string, any>>,
    getAllPosts:  (fields: string[]) => Promise<Record<string, any>[]>,
  }

  export default API;
}
