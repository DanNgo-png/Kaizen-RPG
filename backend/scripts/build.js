const path = require('path');
const webpack = require('webpack');

function main() {
  console.log("Bundling server.mjs...");

  webpack({
    entry: "./server.mjs",
    output: {
      filename: 'server.js',
      // FIX: Go up two levels (scripts -> backend -> root) then into dist
      path: path.resolve(__dirname, '../../dist'), 
      libraryTarget: 'commonjs',
      clean: true
    },
    resolve: {
      extensions: ['.js', '.mjs']
    },
    target: 'node',
    mode: 'production'
  }).run((err, stats) => {
    if (err) {
      console.error("Error bundling:", err);
      return;
    }
    if (stats.hasErrors()) {
      console.error("Webpack Errors:", stats.toString());
      return;
    }
    console.log("✅ Bundled server.mjs successfully to /dist/server.js");
  });
}

main();