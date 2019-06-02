import path from 'path'
import webpack from 'webpack'
import memoryfs from 'memory-fs'

export default (fixture, options) => {
  const compiler = webpack({
    mode: 'none',
    context: __dirname,
    entry: `./${fixture}`,
    output: {
      path: path.resolve(__dirname),
      filename: 'bundle.js',
      libraryTarget: 'commonjs2'
    },
    module: {
      rules: [
        {
          test: /\.ftl$/,
          use: [
            'babel-loader',
            {
              loader: path.resolve(__dirname, '../src/loader.js'),
              options
            }
          ]
        }
      ]
    }
  })
  const fs = new memoryfs()
  compiler.outputFileSystem = fs

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) reject(err)
      else if (stats.hasErrors()) reject(new Error(stats.toJson().errors))
      else {
        const { outputPath } = stats.toJson()
        const bundle = fs.readFileSync(`${outputPath}/bundle.js`, 'utf8')
        resolve(bundle)
      }
    })
  })
}
