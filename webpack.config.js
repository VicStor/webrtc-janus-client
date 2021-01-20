const path = require('path');
const fs = require('fs');

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');
const { InjectManifest, GenerateSW } = require('workbox-webpack-plugin');
var WebpackPwaManifest = require('webpack-pwa-manifest');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

console.log(`appDirectory ${appDirectory}`);

module.exports = (env) => ({
  mode: env,
  devtool: env === 'development' ? 'eval' : 'none',
  entry: {
    app: resolveApp('src/index'),
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
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
  },
  module: {
    rules: [
      {
        test: require.resolve('janus-gateway'),
        loader: 'exports-loader',
        options: {
          exports: 'Janus',
        },
      },
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
    // new GenerateSW(),
    new WebpackPwaManifest({
      short_name: 'WebRTC Demo',
      name: 'WebRTC Demo',
      icons: [],
      display: 'standalone',
      theme_color: '#000000',
      background_color: '#ffffff',
    }),
    new InjectManifest({
      swSrc: resolveApp('src/src-sw.js'),
      swDest: 'sw.js',
      maximumFileSizeToCacheInBytes: 2240000,
    }),
    // new InjectManifest({
    //   swSrc: resolveApp('src/service-worker'),
    //   dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,
    //   exclude: [/\.map$/, /asset-manifest\.json$/, /LICENSE/],
    //   maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    // }),
  ],
});
