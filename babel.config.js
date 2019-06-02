module.exports = {
  babelrc: false,
  presets: [['@babel/preset-env', { loose: true, targets: { node: '8.9' } }]],
  plugins: [['@babel/plugin-proposal-object-rest-spread', { loose: true }]]
}
