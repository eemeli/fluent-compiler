'use strict'
import assert from 'assert'
import ftl from '@fluent/dedent'

import { compileAndRequire } from './util'

suite('Bundle', function() {
  let bundle

  suite('addResource', function() {
    suiteSetup(async function() {
      bundle = await compileAndRequire('en-US', '')
      const src = ftl`
        foo = Foo
        -bar = Bar
        `
      const resource = await compileAndRequire('en-US', src, true)
      bundle.addResource(resource)
    })

    test('adds messages', function() {
      assert.equal(bundle.hasMessage('foo'), true)
      assert.equal(bundle.hasMessage('-bar'), false)
    })
  })

  suite('allowOverrides', function() {
    suiteSetup(async function() {
      bundle = await compileAndRequire('en-US', 'key = Foo')
    })

    test('addResource allowOverrides is false', async function() {
      const resource = await compileAndRequire('en-US', 'key = Bar', true)
      let errors = bundle.addResource(resource)
      assert.equal(errors.length, 1)
      const msg = bundle.getMessage('key')
      assert.equal(bundle.formatPattern(msg.value), 'Foo')
    })

    test('addResource allowOverrides is true', async function() {
      const resource = await compileAndRequire('en-US', 'key = Bar', true)
      let errors = bundle.addResource(resource, { allowOverrides: true })
      assert.equal(errors.length, 0)
      const msg = bundle.getMessage('key')
      assert.equal(bundle.formatPattern(msg.value), 'Bar')
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
