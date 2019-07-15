module.exports = {
  babelrc: false,
  presets: [['@babel/preset-env', { targets: { node: '8.9' } }]],
  plugins: ['@babel/plugin-proposal-object-rest-spread']
}
