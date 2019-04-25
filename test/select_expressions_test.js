'use strict'
import assert from 'assert'
import { compileAndRequire, ftl } from './util'

suite('Select expressions', function() {
  let errs
  setup(function() {
    errs = []
  })

  test('missing selector', async function() {
    const bundle = await compileAndRequire(
      'en-US',
      ftl`
        select = {$none ->
            [a] A
           *[b] B
        }
      `
    )
    const val = bundle.format('select', null, errs)
    assert.equal(val, 'B')

    // Skipping as the missing variable is not detected; instead treated as
    // `undefined`. --Eemeli
    // assert.equal(errs.length, 1)
    // assert(errs[0] instanceof ReferenceError) // unknown variable
  })

  suite('string selectors', function() {
    test('matching selector', async function() {
      const bundle = await compileAndRequire(
        'en-US',
        ftl`
          select = {$selector ->
              [a] A
             *[b] B
          }
        `
      )
      const val = bundle.format('select', { selector: 'a' }, errs)
      assert.equal(val, 'A')
      assert.equal(errs.length, 0)
    })

    test('non-matching selector', async function() {
      const bundle = await compileAndRequire(
        'en-US',
        ftl`
          select = {$selector ->
              [a] A
             *[b] B
          }
        `
      )
      const val = bundle.format('select', { selector: 'c' }, errs)
      assert.equal(val, 'B')
      assert.equal(errs.length, 0)
    })
  })

  suite('number selectors', function() {
    test('matching selector', async function() {
      const bundle = await compileAndRequire(
        'en-US',
        ftl`
          select = {$selector ->
              [0] A
             *[1] B
          }
        `
      )
      const val = bundle.format('select', { selector: 0 }, errs)
      assert.equal(val, 'A')
      assert.equal(errs.length, 0)
    })

    test('non-matching selector', async function() {
      const bundle = await compileAndRequire(
        'en-US',
        ftl`
          select = {$selector ->
              [0] A
             *[1] B
          }
        `
      )
      const val = bundle.format('select', { selector: 2 }, errs)
      assert.equal(val, 'B')
      assert.equal(errs.length, 0)
    })
  })

  suite('plural categories', function() {
    test('matching number selector', async function() {
      const bundle = await compileAndRequire(
        'en-US',
        ftl`
          select = {$selector ->
              [one] A
             *[other] B
          }
        `
      )
      const val = bundle.format('select', { selector: 1 }, errs)
      assert.equal(val, 'A')
      assert.equal(errs.length, 0)
    })

    test('matching string selector', async function() {
      const bundle = await compileAndRequire(
        'en-US',
        ftl`
          select = {$selector ->
              [one] A
             *[other] B
          }
        `
      )
      const val = bundle.format('select', { selector: 'one' }, errs)
      assert.equal(val, 'A')
      assert.equal(errs.length, 0)
    })

    test('non-matching number selector', async function() {
      const bundle = await compileAndRequire(
        'en-US',
        ftl`
          select = {$selector ->
              [one] A
             *[default] D
          }
        `
      )
      const val = bundle.format('select', { selector: 2 }, errs)
      assert.equal(val, 'D')
      assert.equal(errs.length, 0)
    })

    test('non-matching string selector', async function() {
      const bundle = await compileAndRequire(
        'en-US',
        ftl`
          select = {$selector ->
              [one] A
             *[default] D
          }
        `
      )
      const val = bundle.format('select', { selector: 'other' }, errs)
      assert.equal(val, 'D')
      assert.equal(errs.length, 0)
    })

    test('NUMBER() selector', async function() {
      const bundle = await compileAndRequire(
        'en-US',
        ftl`
          select = {NUMBER($selector) ->
              [one] A
             *[other] B
          }
        `
      )
      const val = bundle.format('select', { selector: 1 }, errs)
      assert.equal(val, 'A')
      assert.equal(errs.length, 0)
    })

    test('NUMBER() selector with type: "ordinal"', async function() {
      const bundle = await compileAndRequire(
        'en-US',
        ftl`
          select = {NUMBER($selector, type: "ordinal") ->
              [two] A
             *[other] B
          }
        `
      )
      const val = bundle.format('select', { selector: 2 }, errs)
      assert.equal(val, 'A')
      assert.equal(errs.length, 0)
    })

    test('NUMBER() selector with type: "ordinal" and exact case', async function() {
      const bundle = await compileAndRequire(
        'en-US',
        ftl`
          select = {NUMBER($selector, type: "ordinal") ->
              [2] A
              [two] B
             *[other] C
          }
        `
      )
      const val = bundle.format('select', { selector: 2 }, errs)
      assert.equal(val, 'A')
      assert.equal(errs.length, 0)
    })
  })
})
