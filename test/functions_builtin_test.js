'use strict'

import assert from 'assert'
import ftl from '@fluent/dedent'

import { compileAndRequire } from './util'

suite('Built-in functions', function() {
  suite('NUMBER', function() {
    let bundle, msgDec, msgPct, msgBad

    suiteSetup(async () => {
      bundle = await compileAndRequire(
        'en-US',
        ftl`
          num-decimal = { NUMBER($arg) }
          num-percent = { NUMBER($arg, style: "percent") }
          num-bad-opt = { NUMBER($arg, style: "bad") }
          `
      )
      msgDec = bundle.getMessage('num-decimal')
      msgPct = bundle.getMessage('num-percent')
      msgBad = bundle.getMessage('num-bad-opt')
    })

    test('missing argument', function() {
      assert.equal(bundle.formatPattern(msgDec.value), 'NaN')
      assert.equal(bundle.formatPattern(msgPct.value), 'NaN')
      assert.equal(bundle.formatPattern(msgBad.value), 'NaN')
    })

    test('number argument', function() {
      const args = { arg: 1 }
      assert.equal(bundle.formatPattern(msgDec.value, args), '1')
      assert.equal(bundle.formatPattern(msgPct.value, args), '100%')
      assert.equal(bundle.formatPattern(msgBad.value, args), '1')
    })

    test('string argument', function() {
      const args = { arg: 'Foo' }
      assert.equal(bundle.formatPattern(msgDec.value, args), 'NaN')
      assert.equal(bundle.formatPattern(msgPct.value, args), 'NaN')
      assert.equal(bundle.formatPattern(msgBad.value, args), 'NaN')
    })
  })

  suite('DATETIME', function() {
    let bundle, msgDef, msgMon, msgBad

    suiteSetup(async () => {
      bundle = await compileAndRequire(
        'en-US',
        ftl`
          dt-default = { DATETIME($arg) }
          dt-month = { DATETIME($arg, month: "long") }
          dt-bad-opt = { DATETIME($arg, month: "bad") }
          `
      )
      msgDef = bundle.getMessage('dt-default')
      msgMon = bundle.getMessage('dt-month')
      msgBad = bundle.getMessage('dt-bad-opt')
    })

    test('missing argument', function() {
      assert.equal(bundle.formatPattern(msgDef.value), 'Invalid Date')
      assert.equal(bundle.formatPattern(msgMon.value), 'Invalid Date')
      assert.equal(bundle.formatPattern(msgBad.value), 'Invalid Date')
    })

    test('Date argument', function() {
      const date = new Date('2016-09-29')
      // format the date argument to account for the testrunner's timezone
      const expectedDefault = new Intl.DateTimeFormat('en-US').format(date)
      const expectedMonth = new Intl.DateTimeFormat('en-US', {
        month: 'long'
      }).format(date)

      const args = { arg: date }
      assert.equal(bundle.formatPattern(msgDef.value, args), expectedDefault)
      assert.equal(bundle.formatPattern(msgMon.value, args), expectedMonth)

      // The argument value will be coerced into a string by the join operation
      // in FluentBundle.format.  The result looks something like this; it
      // may vary depending on the TZ:
      //     Thu Sep 29 2016 02:00:00 GMT+0200 (CEST)

      // Skipping for now, as it's not clear why behaviour differs --Eemeli
      // assert.equal(bundle.format('dt-bad-opt', args), date.toString())
    })
  })
})
