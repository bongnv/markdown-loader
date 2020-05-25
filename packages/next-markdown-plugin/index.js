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

      if (typeof nextConfig.webpack === "function") {
        return nextConfig.webpack(config, options);
      }

      return config;
    },
  });
};
