'use strict'
import assert from 'assert'
import { compileAndRequire, ftl } from './util'

suite('Bundle', function() {
  let bundle

  suite('addResource', function() {
    suiteSetup(async function() {
      bundle = await compileAndRequire(
        'en-US',
        ftl`
          foo = Foo
          -bar = Bar
        `
      )
    })

    test('adds messages', function() {
      assert.equal(new Map(bundle.messages).has('foo'), true)
      assert.equal(new Map(bundle.messages).has('-bar'), false)
    })
  })

  suite('allowOverrides', function() {
    suiteSetup(async function() {
      bundle = await compileAndRequire('en-US', 'key = Foo')
    })

    test('addResource allowOverrides is false', async function() {
      let bundle2 = await compileAndRequire('en-US', 'key = Bar')
      let errors = bundle.addResource(bundle2.messages)
      assert.equal(errors.length, 1)
      assert.equal(bundle.format('key'), 'Foo')
    })

    test('addResource allowOverrides is true', async function() {
      let bundle2 = await compileAndRequire('en-US', 'key = Bar')
      let errors = bundle.addResource(bundle2.messages, {
        allowOverrides: true
      })
      assert.equal(errors.length, 0)
      assert.equal(bundle.format('key'), 'Bar')
    })
  })

  suite('hasMessage', function() {
    suiteSetup(async function() {
      bundle = await compileAndRequire(
        'en-US',
        ftl`
          foo = Foo
          bar =
              .attr = Bar Attr
          -term = Term

          # ERROR No value.
          err1 =
          # ERROR Broken value.
          err2 = {}
          # ERROR No attribute value.
          err3 =
              .attr =
          # ERROR Broken attribute value.
          err4 =
              .attr1 = Attr
              .attr2 = {}
        `
      )
    })

    test('returns true only for public messages', function() {
      assert.equal(bundle.hasMessage('foo'), true)
    })

    test('returns false for terms and missing messages', function() {
      assert.equal(bundle.hasMessage('-term'), false)
      assert.equal(bundle.hasMessage('missing'), false)
      assert.equal(bundle.hasMessage('-missing'), false)
    })

    test('returns false for broken messages', function() {
      assert.equal(bundle.hasMessage('err1'), false)
      assert.equal(bundle.hasMessage('err2'), false)
      assert.equal(bundle.hasMessage('err3'), false)
      assert.equal(bundle.hasMessage('err4'), false)
    })
  })
})
