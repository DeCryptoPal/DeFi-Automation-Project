const path = require('path');

/**
 * Webpack configuration for the DeFi automation demo. This config
 * transpiles TypeScript files (including the adapted core_logic.ts) to
 * JavaScript and bundles them for a Node.js environment. The output is
 * written to the `dist` directory, and the target is set to `node` so that
 * built‑in Node modules remain external.
 */
module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  target: 'node',
};