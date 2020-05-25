import webpack from "webpack";
import { Attacher, Transformer } from 'unified';
import { VFile } from "vfile";
import { Node } from "unist";
import visit from "unist-util-visit";
import { Context } from "@bongnv/markdown-loader";

const  MarkdownImagesPlugin = ({ hooks }: Context) => {
  const remarkImages = (loaderContext: webpack.loader.LoaderContext): Attacher => {
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
            const traceRequest = `${node.url}?trace`;
            const result = await loadModule(traceRequest);
            const rawHtml = `<img class="lazy" src="${result.trace}" data-src="${result.src}" alt="${node.alt}">`;
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

  hooks.beforeParse.tap("MarkdownImagesPlugin", ({ loaderContext, processor}) => {
    processor!.use(remarkImages(loaderContext))
  })
}

module.exports = MarkdownImagesPlugin;
