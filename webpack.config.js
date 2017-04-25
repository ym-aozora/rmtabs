const pkg = require('./package.json');
const webpack = require('webpack');
const banner = [
  `${pkg.name} - ${pkg.description}`,
  `@version v${pkg.version}`,
  `@link ${pkg.homepage}`,
  `@license ${pkg.license}`,
].join('\n');
const env = process.env.NODE_ENV || 'development';
const inproduction = (env === 'production');

module.exports = {
  context: __dirname,
  devtool: inproduction ? false : 'source-map',
  entry: {
    background: './src/js/background.js',
    contentscript: './src/js/contentscript.js',
    setting: './src/js/setting.js',
  },
  output: {
    path: __dirname + '/dist',
    filename: 'js/[name].js',
    sourceMapFilename: 'js/[name].js.map',
  },
  resolve: {
    modules: [
      'src/js',
      'node_modules',
    ],
  },
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'eslint-loader',
            options: {
              configFile: './.eslintrc.yml',
            },
          },
        ],
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['es2015', 'react', 'stage-2'],
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.BannerPlugin(banner),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(env),
      },
    }),
    ...(inproduction ? [
      new webpack.optimize.UglifyJsPlugin(),
    ] : []),
  ],
};
