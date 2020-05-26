const resolve = require.context("@content", true, /\.md$/, "lazy");

const pick = (data, fields) => {
  const newData = {};
  fields.forEach((field) => {
    if (field in data) {
      newData[field] = data[field]
    }
  });
  return newData;
}

const getPostBySlug = async (slug, fields) => {
  const md = await resolve(`./${slug}.md`);

  return pick(
    {
      ...md,
      slug,
    },
    fields,
  );
};

export const getAllPosts = async (fields) => Promise.all(
  resolve
    .keys()
    .reverse()
    .map((url) => getPostBySlug(url.slice(2, -3), fields))
);

export default {
  getPostBySlug,
  getAllPosts,
}
