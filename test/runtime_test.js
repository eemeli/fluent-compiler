import assert from 'assert'

import Runtime from '../src/runtime'

suite('Runtime', function() {
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

    test('Built-in DATETIME formatter', function() {
      const dtf = new Intl.DateTimeFormat()
      const d = new Date()
      assert.equal(rt.DATETIME({}, d), dtf.format(d))
    })

    test('Built-in NUMBER formatter', function() {
      const nf = new Intl.NumberFormat()
      const value = 1.2
      const fmt = nf.format(value)
      assert.deepEqual(rt.NUMBER({}, value), { $: {}, fmt, value })
    })

    test('Select with string', function() {
      assert.equal(rt.select('foo', 'bar', { foo: 'Foo' }), 'Foo')
    })

    test('Select: fall back to default variant', function() {
      assert.equal(rt.select('bar', 'foo', { foo: 'Foo' }), 'Foo')
    })

    test('Select with number', function() {
      assert.equal(rt.select(1, 'other', { one: 'Foo', other: 'Bar' }), 'Foo')
    })

    test('Select with NUMBER()', function() {
      const n = rt.NUMBER({}, 1)
      assert.equal(rt.select(n, 'other', { one: 'Foo', other: 'Bar' }), 'Foo')
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

    test('Built-in DATETIME formatter', function() {
      const dtf = new Intl.DateTimeFormat('fi')
      const d = new Date()
      assert.equal(rt.DATETIME({}, d), dtf.format(d))
    })

    test('Built-in NUMBER formatter', function() {
      const nf = new Intl.NumberFormat('fi')
      const value = 1.2
      const fmt = nf.format(value)
      assert.deepEqual(rt.NUMBER({}, value), { $: {}, fmt, value })
    })

    test('Select with number', function() {
      assert.equal(rt.select(1, 'other', { one: 'Foo', other: 'Bar' }), 'Foo')
    })

    test('Select with NUMBER()', function() {
      const n = rt.NUMBER({}, 1)
      assert.equal(rt.select(n, 'other', { one: 'Foo', other: 'Bar' }), 'Foo')
    })
  })
})
