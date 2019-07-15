import assert from 'assert'

import { FluentBundle } from './bundle'

suite('Bundle runtime', function() {
  suite('Undefined locale uses system fallback', function() {
    test('Format message', function() {
      const value = () => ['Foo', 'Bar']
      const bundle = new FluentBundle(undefined, new Map([['foo', { value }]]))
      const msg = bundle.getMessage('foo')
      assert.equal(bundle.formatPattern(msg.value), 'FooBar')
    })

    test('Format message attribute', function() {
      const value = () => ['Foo']
      const attributes = { bar: () => ['Bar'] }
      const bundle = new FluentBundle(
        undefined,
        new Map([['foo', { value, attributes }]])
      )
      const msg = bundle.getMessage('foo')
      assert.equal(bundle.formatPattern(msg.attributes.bar), 'Bar')
    })
  })

  suite('With set locale "fi"', function() {
    test('Format message', function() {
      const value = () => ['Foo', 'Bar']
      const bundle = new FluentBundle(['fi'], new Map([['foo', { value }]]))
      const msg = bundle.getMessage('foo')
      assert.equal(bundle.formatPattern(msg.value), 'FooBar')
    })
  })
})
