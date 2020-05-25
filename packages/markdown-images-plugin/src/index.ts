import { Attacher, Transformer } from 'unified';
import { VFile } from "vfile";
import { Node } from "unist";
import visit from "unist-util-visit";
import { Context } from "@bongnv/markdown-loader";

const  MarkdownImagesPlugin = ({ loaderContext, hooks }: Context) => {
  const remarkImages = (): Attacher => {
    return (): Transformer => {
      return (tree: Node, file: VFile, next) => {
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
            const alt = node.alt ? `alt="${node.alt}"` : "";
            const result = await loadModule(<string>node.url);
            const rawHtml = `<img class="lazy" src="${result.trace}" data-src="${result.src}" ${alt}">`;
            node.type = "html";
            node.value = rawHtml;
          }),
        )
          .then(() => next && next(null, tree, file))
          .catch(err => {
            next && next(err, tree, file);
          });
      };
    };
  }

  hooks.beforeParse.tap("MarkdownImagesPlugin", ({ processor}) => {
    processor!.use(remarkImages())
  })
}

module.exports = MarkdownImagesPlugin;
