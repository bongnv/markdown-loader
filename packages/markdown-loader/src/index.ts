import graymatter from "gray-matter";
import remark from "remark";
import sanitizeHTML from "sanitize-html";
import { Attacher, Pluggable, Transformer } from "unified";
import { Node } from "unist";
import vfile from "vfile";
import webpack from "webpack";
import visit from "unist-util-visit";
import _ from "lodash";

const EXCERPT_LENGTH = 200;
const READING_SPEED = 230;

function buildPlugins(plugins: (string | Pluggable)[] = []): Pluggable[] {
  const normalize = (entry: string | Pluggable) => {
    return typeof entry === "string" ? require(entry) : entry;
  };

  return plugins.map((entry) => {
    return Array.isArray(entry)
      ? [normalize(entry[0]), entry[1] || {}]
      : [normalize(entry), {}];
  });
}

const remarkImages = (
  loaderContext: webpack.loader.LoaderContext,
): Attacher => {
  return (): Transformer => {
    return (tree: Node, file: vfile.VFile, next) => {
      const loadModule = (request: string) =>
        new Promise<any>((resolve, reject) => {
          loaderContext.loadModule(request, (err, source) => {
            if (err) {
              reject(err);
            }

            resolve(eval(source));
          });
        });

      const nodes: Node[] = [];
      visit(tree, "image", (node: Node) => {
        nodes.push(node);
      });

      Promise.all(
        nodes.map(async (node) => {
          const traceRequest = `${node.url}?trace`;
          const result = await loadModule(traceRequest);
          const rawHtml = `<img class="lazy" src="${result.trace}" data-src="${result.src}" alt="${node.alt}">`;
          node.type = "html";
          node.value = rawHtml;
        }),
      ).then(() => next && next(null, tree, file));
    };
  };
};

const getExcerpt = (text: string, length: number): string => {
  let excerpt = text.replace(/\r?\n|\r/g, " ");

  if (excerpt.length > length && length) {
    excerpt = excerpt.substr(0, excerpt.lastIndexOf(" ", length - 1)) + "...";
  }

  return excerpt;
};

const getTimeToRead = (text: string, speed: number): number => {
  const count = _.words(text).length;
  return Math.ceil(count / speed) || 1;
};

interface Heading {
  value: string;
  depth: number;
  anchor: string;
}

const getHeadings = (ast: Node, depth: number): Heading[] => {
  const headings: Heading[] = [];

  visit(ast, "heading", (node) => {
    const heading: Heading = {
      depth: <number>node.depth,
      value: "",
      anchor: "",
    };
    const children = <Record<string, string>[]>(node.children || []);

    for (let i = 0, l = children.length; i < l; i++) {
      const el = children[i];

      if (el.type === "link") {
        heading.anchor = el.url;
      } else if (el.value) {
        heading.value += el.value;
      }
    }

    headings.push(heading);
  });

  return headings.filter(
    (heading) => heading.depth > 1 && heading.depth <= depth,
  );
};

const MarkdownLoader: webpack.loader.Loader = function (source) {
  const callback = this.async();

  const { data, content } = graymatter(source);

  const plugins = buildPlugins([
    "remark-slug",
    "remark-autolink-headings",
    "@gridsome/remark-prismjs",
    remarkImages(this),
    "remark-html",
  ]);
  const processor = remark().use(plugins);

  const tree = processor.parse(content);
  processor.run(tree).then((ast) => {
    const html = processor.stringify(ast);
    const text = sanitizeHTML(html, {
      allowedAttributes: {},
      allowedTags: [],
    });

    if (!data.excerpt) {
      data.excerpt = getExcerpt(text, EXCERPT_LENGTH);
    }

    const exported = {
      ...data,
      html,
      timeToRead: getTimeToRead(text, READING_SPEED),
      headings: getHeadings(ast, 3),
    };

    callback!(null, `module.exports = ${JSON.stringify(exported)}`);
  });
};

module.exports = MarkdownLoader;
