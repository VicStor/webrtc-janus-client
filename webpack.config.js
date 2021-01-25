const path = require('path');
const fs = require('fs');

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');
const { InjectManifest } = require('workbox-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

module.exports = (env) => ({
  mode: env,
  devtool: env === 'development' ? 'eval' : 'none',
  entry: {
    app: resolveApp('src/index'),
    'get-vizio-client': resolveApp('src/get-vizio-client.js'),
  },
  output: {
    filename: '[name].[hash].js',
    path: resolveApp('dist'),
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json', '.css'],
  },
  optimization: {
    minimize: env === 'production',
  },
  devServer: {
    port: 3000,
    hot: true,
    https: {
      key: resolveApp('certificates/server.key'),
      cert: resolveApp('certificates/server.crt'),
      // ca: resolveApp('certificates/rootCA.pem'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(css|scss)$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(ts|tsx)?$/,
        exclude: path.resolve(__dirname, 'node_modules'),
        loader: 'ts-loader',
      },
      {
        test: /\.(ttf|eot|svg|woff(2)?)(\?[a-z0-9=&.]+)?$/,
        loader: 'file-loader',
      },
      {
        test: /\.(png|jpg|gif)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              fallback: 'responsive-loader',
            },
          },
        ],
      },
      {
        test: /\.(js|jsx)$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
            plugins: [
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-proposal-optional-chaining',
            ],
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  target: 'web',
  plugins: [
    new webpack.ProgressPlugin(),
    new CleanWebpackPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env),
      'process.env.DIST_URL': JSON.stringify(env),
    }),
    new InterpolateHtmlPlugin(HtmlWebpackPlugin, {
      PUBLIC_URL: 'public/',
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: resolveApp('public/index.html'),
    }),
    new WebpackPwaManifest({
      short_name: 'WebRTC Demo',
      name: 'WebRTC Demo',
      icons: [],
      display: 'standalone',
      theme_color: '#000000',
      background_color: '#ffffff',
      icons: [
        {
          src: resolveApp('public/favicon.ico'),
          sizes: '64x64 32x32 24x24 16x16',
          type: 'image/x-icon',
        },
        {
          src: resolveApp('public/logo192.png'),
          type: 'image/png',
          sizes: '192x192',
        },
        {
          src: resolveApp('public/logo512.png'),
          type: 'image/png',
          sizes: '512x512',
        },
      ],
    }),
    new InjectManifest({
      swSrc: resolveApp('src/service-worker/service-worker'),
      swDest: 'sw.js',
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      exclude: [/\.map$/, /asset-manifest\.json$/, /LICENSE/],
    }),
  ],
});
