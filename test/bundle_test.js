import assert from 'assert'

import Runtime from '../src/runtime'

suite('Bundle runtime', function() {
  suite('Undefined locale uses system fallback', function() {
    let rt
    setup(function() {
      rt = new Runtime(undefined)
    })

    test('Format message', function() {
      const value = () => ['Foo', 'Bar']
      const bundle = rt.bundle(new Map([['foo', { value }]]))
      assert.equal(bundle.format('foo'), 'FooBar')
    })

    test('Format message attribute', function() {
      const value = () => ['Foo']
      const attr = { bar: () => ['Bar'] }
      const bundle = rt.bundle(new Map([['foo', { value, attr }]]))
      assert.equal(bundle.format('foo.bar'), 'Bar')
    })

    test('Compound message', function() {
      const value = () => ['Foo']
      const attr = { bar: () => ['Bar'] }
      const bundle = rt.bundle(new Map([['foo', { value, attr }]]))
      assert.deepEqual(bundle.compound('foo'), {
        value: 'Foo',
        attributes: new Map([['bar', 'Bar']])
      })
    })
  })

  suite('With set locale "fi"', function() {
    let rt
    setup(function() {
      rt = new Runtime('fi')
    })

    test('Format message', function() {
      const value = () => ['Foo', 'Bar']
      const bundle = rt.bundle(new Map([['foo', { value }]]))
      assert.equal(bundle.format('foo'), 'FooBar')
    })
  })
})
