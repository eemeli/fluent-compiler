import fs from 'fs'
import path from 'path'
import tmp from 'tmp'

import { compile } from '../src'

export function compileAndRequire(locale, ftlSrc, asResource) {
  const runtimePath = path.resolve(__dirname, 'runtime')
  const jsSrc = compile(locale, ftlSrc, {
    runtime: asResource ? 'resource' : 'bundle',
    runtimePath
  })
  return new Promise((resolve, reject) => {
    tmp.file({ postfix: '.js' }, (err, path, fd) => {
      if (err) reject(err)
      else {
        fs.write(fd, jsSrc, 0, 'utf8', err => {
          if (err) reject(err)
          else resolve(require(path).default)
        })
      }
    })
  })
}
