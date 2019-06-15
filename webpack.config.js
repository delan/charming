const path = require("path");
const webpack = require("webpack");
const CompressionPlugin = require("compression-webpack-plugin");

const config = {
  entry: {
    old: "./src/old.js",
    new: "./src/new.tsx",
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
  },
  devServer: {
    contentBase: "./dist",
  },
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx"],
  },
  module: {
    rules: [
      {
        test: /[.]sass$/,
        exclude: /[/]node_modules[/]/,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "sass-loader",
            options: {
              implementation: require("sass"),
            },
          },
        ],
      },
      {
        test: /[.](js|ts)x?$/,
        exclude: /[/]node_modules[/]/,
        loader: "babel-loader",
      },
      {
        test: /[.]bin$/,
        exclude: /[/]node_modules[/]/,
        loader: "file-loader",
      },
    ],
  },
  plugins: [],
};

module.exports = (env, argv) => {
  switch (argv.mode) {
    case "production":
      config.devtool = "source-map";
      config.plugins.push(
        new CompressionPlugin({
          filename: "[path].br[query]",
          algorithm: "brotliCompress",
          test: /[.](js|bin)$/,
          cache: true,
        }),
      );
      break;
    case "development":
      config.devtool = "cheap-module-eval-source-map";
      break;
    default:
      // breaks webpack-dev-server
      // config.plugins.push(new webpack.debug.ProfilingPlugin());
      break;
  }

  return config;
};
