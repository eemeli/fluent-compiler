'use strict'

require('@babel/register')({
  ignore: [/node_modules/],
  plugins: [
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-transform-modules-commonjs'
  ]
})
