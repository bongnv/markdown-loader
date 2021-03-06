const path = require("path");

module.exports = (nextConfig = {}) => {
  const contentDir = nextConfig.contentDir || path.resolve(process.cwd(), "content");
  const apiModule =  path.resolve(__dirname, "api.js");

  return Object.assign({}, nextConfig, {
    webpack: (config, options) => {
      config.module.rules.push({
        test: /\.md$/,
        use: {
          loader: "@bongnv/markdown-loader",
          options: {
            plugins: [
              require("@bongnv/markdown-images-plugin"),
            ]
          }
        }
      });

      // TODO: assert when module is not found
      config.module.rules.push({
        test: /\.(jpg|jpeg|png|svg|webp|gif|ico)$/,
        issuer: /\.md$/,
        use: [
          "image-trace-loader",
          {
            loader: "file-loader",
            options: {
              outputPath: `${options.isServer ? '../' : ''}static/images/`,
              publicPath: "/_next/static/images",
            }
          },
          {
            loader: "image-webpack-loader",
            options: {
              disable: options.dev,
            }
          },
        ]
      })

      config.resolve.alias["@content/api"] = apiModule;
      config.resolve.alias["@content"] = contentDir;

      if (typeof nextConfig.webpack === "function") {
        return nextConfig.webpack(config, options);
      }

      return config;
    },
  });
};
