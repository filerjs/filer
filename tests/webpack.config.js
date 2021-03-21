const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

module.exports = env => ({
    mode: 'development',
    entry: path.resolve(__dirname, './webpack-tests.js'),
    resolve: {
        alias: {
            'fsProvider': path.resolve(__dirname, '../shims/providers/default'),
        },
    },
    output: {
        path: path.resolve(__dirname, './dist-webpack'),
        filename: 'index.js',
    },
    plugins: [
        new webpack.ContextReplacementPlugin(
            // Mocha safely uses require in such a way that webpack cannot statically extract dependancies.
            // If the ignoreRequestDependancyExpressionWarnings env is set, we will aggregate these warnings
            // into one summary warning to minimise spamming the console.
            /\/node_modules\/mocha\/lib/,
            (data) => {
                if (env.ignoreRequestDependancyExpressionWarnings) {
                    let requestDependencyExpressionsIgnored = 0;
                    data.dependencies.forEach((dependancy) => {
                        if (dependancy.critical === 'the request of a dependency is an expression') {
                            dependancy.critical = undefined;
                            requestDependencyExpressionsIgnored += 1;
                        }
                    });
                    console.log(`WARNING: Ignoring ${requestDependencyExpressionsIgnored} "request of a dependency is an expression" warnings from "node_modules/mocha/lib".`);
                }
                return data;
            },
        ),
        new NodePolyfillPlugin(),
        new MiniCssExtractPlugin(),
        new HtmlWebpackPlugin({
            title: 'Filer Tests - Webpack Build',
            template: './tests/webpack.index.html',
        }),
    ],
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
        ],
    },
    optimization: {
        minimize: false,
    },
    devtool: 'inline-source-map',
    devServer: {
        contentBase: path.resolve(__dirname, './dist-webpack'),
    }
});
