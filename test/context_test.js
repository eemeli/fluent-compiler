'use strict'
import assert from 'assert'
import { compileAndRequire, ftl } from './util'

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
      assert.equal(bundle.format('key'), 'Foo')
    })

    test('addResource allowOverrides is true', async function() {
      const resource = await compileAndRequire('en-US', 'key = Bar', true)
      let errors = bundle.addResource(resource, { allowOverrides: true })
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

  suite('format', function() {
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

    test('returns value only for public messages', function() {
      const errors = []
      assert.equal(bundle.format('foo', errors), 'Foo')
      assert.equal(errors.length, 0)
    })

    test('returns id for terms and missing messages', function() {
      let errors = []
      assert.equal(bundle.format('-term', {}, errors), '-term')
      console.log(errors)
      assert.equal(errors[0].message, 'Unknown message: -term')

      errors = []
      assert.equal(bundle.format('missing', {}, errors), 'missing')
      assert.equal(errors[0].message, 'Unknown message: missing')

      errors = []
      assert.equal(bundle.format('-missing', {}, errors), '-missing')
      assert.equal(errors[0].message, 'Unknown message: -missing')
    })

    test('returns id for broken messages', function() {
      let errors = []
      assert.equal(bundle.format('err1', {}, errors), 'err1')
      assert.ok(errors[0] instanceof ReferenceError)

      errors = []
      assert.equal(bundle.format('err2', {}, errors), 'err2')
      assert.ok(errors[0] instanceof ReferenceError)

      errors = []
      assert.equal(bundle.format('err3', {}, errors), 'err3')
      assert.ok(errors[0] instanceof ReferenceError)

      errors = []
      assert.equal(bundle.format('err4', {}, errors), 'err4')
      assert.ok(errors[0] instanceof ReferenceError)
    })
  })
})
