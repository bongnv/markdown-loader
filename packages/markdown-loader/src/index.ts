import graymatter from "gray-matter";
import remark from "remark";
import sanitizeHTML from "sanitize-html";
import unified from "unified";
import { Node } from "unist";
import webpack from "webpack";
import visit from "unist-util-visit";
import _ from "lodash";
import loaderUtils from "loader-utils";
import { AsyncSeriesHook } from "tapable";

const EXCERPT_LENGTH = 200;
const READING_SPEED = 230;

export interface Context {
  loaderContext: webpack.loader.LoaderContext;
  processor?: unified.Processor;
  hooks: {
    beforeParse: AsyncSeriesHook;
  }
}

function buildPlugins(plugins: (string | unified.Pluggable)[] = []): unified.Pluggable[] {
  const normalize = (entry: string | unified.Pluggable) => {
    return typeof entry === "string" ? require(entry) : entry;
  };

  return plugins.map((entry) => {
    return Array.isArray(entry)
      ? [normalize(entry[0]), entry[1] || {}]
      : [normalize(entry), {}];
  });
}

type Plugin = (context: Context) => void;
type Plugable = string | [string, object] | Plugin;

const applyPlugins = (plugins: Plugable[], context: Context) => {
  const applyPlugin = (plugable: Plugable) => {
    if (typeof plugable === "string") {
      require(plugable)(context);
      return;
    }

    if (Array.isArray(plugable)) {
      require(plugable[0])(context, plugable[1]);
      return;
    }

    plugable(context);
    return;
  }

  plugins.map((entry) => applyPlugin(entry));
}

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

const transformMarkdown = async (loaderContext: webpack.loader.LoaderContext, source: string | Buffer) => {
  const options = loaderUtils.getOptions(loaderContext) || {};
  const context: Context = {
    loaderContext,
    hooks: {
      beforeParse: new AsyncSeriesHook(["context"]),
    }
  }
  applyPlugins(options.plugins, context);

  const { data, content } = graymatter(source);

  const plugins = buildPlugins([
    "remark-slug",
    "remark-autolink-headings",
    "@gridsome/remark-prismjs",
    "remark-html",
  ]);

  const processor = remark().use(plugins);

  context.processor = processor;
  await context.hooks.beforeParse.promise(context);
  const tree = processor.parse(content);
  const ast = await processor.run(tree);
  const html = processor.stringify(ast);
  const text = sanitizeHTML(html, {
    allowedAttributes: {},
    allowedTags: [],
  });

  if (!data.excerpt) {
    data.excerpt = getExcerpt(text, EXCERPT_LENGTH);
  }

  return {
    ...data,
    html,
    timeToRead: getTimeToRead(text, READING_SPEED),
    headings: getHeadings(ast, 3),
  }
}

const MarkdownLoader: webpack.loader.Loader = function (source) {
  const callback = this.async();

  transformMarkdown(this, source)
    .then((exported) => {
      callback!(null, `module.exports = ${JSON.stringify(exported)}`);
    })
    .catch((err) => {
      callback!(err);
    });
};

module.exports = MarkdownLoader;
