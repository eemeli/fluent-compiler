const modules = process.env.ESM ? false : 'auto'

module.exports = {
  babelrc: false,
  presets: [['@babel/preset-env', { loose: true, modules }]],
  plugins: ['@babel/plugin-proposal-object-rest-spread']
}
