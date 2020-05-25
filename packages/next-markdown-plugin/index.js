module.exports = (nextConfig = {}) => {
  return Object.assign({}, nextConfig, {
    webpack: (config, options) => {
      config.module.rules.push({
        test: /\.md$/,
        use: {
          loader: "@bongnv/markdown-loader",
          options: {
            plugins: [
              "@bongnv/markdown-images-plugin",
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

      if (typeof nextConfig.webpack === "function") {
        return nextConfig.webpack(config, options);
      }

      return config;
    },
  });
};
