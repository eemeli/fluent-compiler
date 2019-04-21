'use strict'

require('@babel/register')({
  plugins: [
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-transform-modules-commonjs'
  ]
})
