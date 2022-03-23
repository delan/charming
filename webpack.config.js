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
  },
  output: {
    filename: "[contenthash]/[name].js",
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
        test: /[.]html$/,
        loader: "html-loader",
      },
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
              inline: true,
              fallback: false,
              name: "[hash:20]/[name].js",
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
        test: /[.](woff|ttf|otf)$/,
        exclude: /[/]node_modules[/]/,
        loader: "file-loader",
        options: {
          name: "[hash:20]/[name].[ext]",
        },
      },
      {
        test: /[.]bin$/,
        exclude: /[/]node_modules[/]/,
        loader: "file-loader",
        options: {
          name: "[hash:20]/[name].[ext]",
        },
      },
      {
        test: /[.](eot|svg|ttf|woff|woff2)$/,
        include: /[/]node_modules[/]@fortawesome[/]fontawesome-free[/]/,
        loader: "file-loader",
        options: {
          name: "[hash:20]/[name].[ext]",
        },
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
  ],
};

module.exports = (env, argv) => {
  switch (argv.mode) {
    case "production":
      config.devtool = "source-map";
      config.plugins.push(
        new CompressionPlugin({
          filename: "[path].br[query]",
          algorithm: "brotliCompress",
          test: /[.](js|eot|svg|ttf|woff|woff2|otf|bin)$/,
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
