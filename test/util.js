import fs from 'fs'
import path from 'path'
import tmp from 'tmp'

import { compile } from '../src'

function nonBlank(line) {
  return !/^\s*$/.test(line)
}

function countIndent(line) {
  const [indent] = line.match(/^\s*/)
  return indent.length
}

export function ftl(strings) {
  const [code] = strings
  const lines = code.split('\n').slice(1, -1)
  const indents = lines.filter(nonBlank).map(countIndent)
  const common = Math.min(...indents)
  const indent = new RegExp(`^\\s{${common}}`)
  const dedented = lines.map(line => line.replace(indent, ''))
  return `${dedented.join('\n')}\n`
}

export function compileAndRequire(locale, ftlSrc, asResource) {
  const runtimePath = path.resolve(__dirname, 'runtime')
  const jsSrc = compile(locale, ftlSrc, { runtimePath })
  return new Promise((resolve, reject) => {
    tmp.file({ postfix: '.js' }, (err, path, fd) => {
      if (err) reject(err)
      else {
        fs.write(fd, jsSrc, 0, 'utf8', err => {
          if (err) reject(err)
          else {
            const { default: bundle, resource } = require(path)
            resolve(asResource ? resource : bundle)
          }
        })
      }
    })
  })
}
