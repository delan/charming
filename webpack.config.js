const path = require("path");
const { execSync } = require("child_process");
const webpack = require("webpack");
const DefinePlugin = require("webpack/lib/DefinePlugin");
const CompressionPlugin = require("compression-webpack-plugin");
const HtmlPlugin = require("html-webpack-plugin");

const config = {
  entry: {
    old: "./src/old.js",
    new: "./src/new.tsx",
    perf: "./src/perf.ts",
  },
  output: {
    filename: "[contenthash]/[name].js",
    assetModuleFilename: "[hash:20]/[name][ext]",
    path: path.resolve(__dirname, "dist"),
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
        test: /[.]worker[.](js|ts)x?$/,
        exclude: /[/]node_modules[/]/,
        use: [
          {
            loader: "worker-loader",
            options: {
              inline: "no-fallback",
              chunkFilename: "[hash:20]/[name].js",
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
        test: /[.](woff2|woff|ttf|otf)$/,
        exclude: /[/]node_modules[/]/,
        type: "asset/resource",
      },
      {
        test: /[.]bin$/,
        exclude: /[/]node_modules[/]/,
        type: "asset/resource",
      },
      {
        test: /[.](eot|svg|ttf|woff|woff2)$/,
        include: /[/]node_modules[/]@fortawesome[/]fontawesome-free[/]/,
        type: "asset/resource",
      },
    ],
  },
  plugins: [
    new DefinePlugin({
      __COMMIT_HASH__: JSON.stringify(
        `${execSync("git rev-parse HEAD")}`.trim(),
      ),
    }),
    new HtmlPlugin({
      filename: "old.html",
      template: "src/old.html",
      chunks: ["old"],
    }),
    new HtmlPlugin({
      filename: "index.html",
      template: "src/new.html",
      chunks: ["new"],
    }),
    new HtmlPlugin({
      filename: "perf.html",
      template: "src/perf.html",
      chunks: ["perf"],
    }),
  ],
  ignoreWarnings: [
    // TEMP: old versions of frontend dependencies trigger deprecation warnings in sass
    // TODO: remove once frontend dependencies are upgraded
    { module: /node_modules/ },
  ],
};

module.exports = (env, argv) => {
  switch (argv.mode) {
    case "production":
      config.devtool = "source-map";
      config.plugins.push(
        new CompressionPlugin({
          filename: "[file].br[query]",
          algorithm: "brotliCompress",
          test: /[.](js|eot|svg|ttf|woff|woff2|otf|bin)$/,
        }),
      );
      break;
    case "development":
      config.devtool = "eval-cheap-module-source-map";
      break;
    default:
      // breaks webpack-dev-server
      // config.plugins.push(new webpack.debug.ProfilingPlugin());
      break;
  }

  return config;
};
