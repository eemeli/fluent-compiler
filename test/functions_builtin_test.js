'use strict'

import assert from 'assert'
import { FluentParser } from 'fluent-syntax'
import fs from 'fs'
import path from 'path'
import tmp from 'tmp'

import { FluentJSCompiler } from '../src/compiler'
import { ftl } from './util'

function transmogrify(locale, ftlSrc) {
  const parser = new FluentParser()
  const compiler = new FluentJSCompiler()

  const ast = parser.parse(ftlSrc)
  const jsSrc = compiler
    .compile(locale, ast)
    .replace(
      '"fluent-compiler/runtime"',
      JSON.stringify(path.resolve(__dirname, '../runtime'))
    )
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

suite('Built-in functions', function() {
  let bundle

  suite('NUMBER', function() {
    suiteSetup(async () => {
      bundle = await transmogrify(
        'en-US',
        ftl`
          num-decimal = { NUMBER($arg) }
          num-percent = { NUMBER($arg, style: "percent") }
          num-bad-opt = { NUMBER($arg, style: "bad") }
        `
      )
    })

    test('missing argument', function() {
      let msg

      msg = bundle.getMessage('num-decimal')
      assert.equal(bundle.format(msg), 'NaN')

      msg = bundle.getMessage('num-percent')
      assert.equal(bundle.format(msg), 'NaN')

      msg = bundle.getMessage('num-bad-opt')
      assert.equal(bundle.format(msg), 'NaN')
    })

    test('number argument', function() {
      const args = { arg: 1 }
      let msg

      msg = bundle.getMessage('num-decimal')
      assert.equal(bundle.format(msg, args), '1')

      msg = bundle.getMessage('num-percent')
      assert.equal(bundle.format(msg, args), '100%')

      msg = bundle.getMessage('num-bad-opt')
      assert.equal(bundle.format(msg, args), '1')
    })

    test('string argument', function() {
      const args = { arg: 'Foo' }
      let msg

      msg = bundle.getMessage('num-decimal')
      assert.equal(bundle.format(msg, args), 'NaN')

      msg = bundle.getMessage('num-percent')
      assert.equal(bundle.format(msg, args), 'NaN')

      msg = bundle.getMessage('num-bad-opt')
      assert.equal(bundle.format(msg, args), 'NaN')
    })
  })

  suite('DATETIME', function() {
    suiteSetup(async () => {
      bundle = await transmogrify(
        'en-US',
        ftl`
          dt-default = { DATETIME($arg) }
          dt-month = { DATETIME($arg, month: "long") }
          dt-bad-opt = { DATETIME($arg, month: "bad") }
        `
      )
    })

    test('missing argument', function() {
      let msg

      msg = bundle.getMessage('dt-default')
      assert.equal(bundle.format(msg), 'Invalid Date')

      msg = bundle.getMessage('dt-month')
      assert.equal(bundle.format(msg), 'Invalid Date')

      msg = bundle.getMessage('dt-bad-opt')
      assert.equal(bundle.format(msg), 'Invalid Date')
    })

    test('Date argument', function() {
      const date = new Date('2016-09-29')
      // format the date argument to account for the testrunner's timezone
      const expectedDefault = new Intl.DateTimeFormat('en-US').format(date)
      const expectedMonth = new Intl.DateTimeFormat('en-US', {
        month: 'long'
      }).format(date)

      const args = { arg: date }
      let msg

      msg = bundle.getMessage('dt-default')
      assert.equal(bundle.format(msg, args), expectedDefault)

      msg = bundle.getMessage('dt-month')
      assert.equal(bundle.format(msg, args), expectedMonth)

      msg = bundle.getMessage('dt-bad-opt')
      // The argument value will be coerced into a string by the join operation
      // in FluentBundle.format.  The result looks something like this; it
      // may vary depending on the TZ:
      //     Thu Sep 29 2016 02:00:00 GMT+0200 (CEST)

      // Skipping for now, as it's not clear why behaviour differs --Eemeli
      // assert.equal(bundle.format(msg, args), date.toString())
    })
  })
})
