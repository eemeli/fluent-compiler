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
      filename: 'bundle.js'
    },
    module: {
      rules: [
        {
          test: /\.ftl$/,
          use: {
            loader: path.resolve(__dirname, '../src/loader.js'),
            options
          }
        }
      ]
    }
  })
  compiler.outputFileSystem = new memoryfs()

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) reject(err)
      else if (stats.hasErrors()) reject(new Error(stats.toJson().errors))
      else {
        const { modules } = stats.toJson()
        const ftlModule = modules.find(mod => /\.ftl$/.test(mod.identifier))
        resolve(ftlModule.source)
      }
    })
  })
}
