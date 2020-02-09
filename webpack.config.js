const path = require('path');

module.exports = {
  entry: {
    app: './src/index.js',
    game: './src/game.js',
    gfx: './src/gfx_repo_client.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'public/js'),
    library: 'bc',
    libraryTarget: 'global',
    libraryExport: 'default'    
  },
};