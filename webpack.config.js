const path = require("path");
const CompressionPlugin = require("compression-webpack-plugin");

module.exports = {
    entry: "./src/index.ts",
    output: {
        filename: "script.js",
        path: path.resolve(__dirname, "dist"),
    },
    mode: "development",
    devServer: {
        contentBase: "./dist",
    },
    resolve: {
        extensions: [".js", ".ts"],
    },
    module: {
        rules: [
            {
                test: /[.]js$/,
                exclude: /[/]node_modules[/]/,
                loader: "babel-loader",
            },
            {
                test: /[.]ts$/,
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
    plugins: [
        new CompressionPlugin({
            filename: '[path].br[query]',
            algorithm: 'brotliCompress',
            test: /[.](js|bin)$/,
            cache: true,
        }),
    ],
};
