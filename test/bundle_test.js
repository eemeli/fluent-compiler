import assert from 'assert'

import Runtime from '../src/runtime'
import Bundle from '../src/runtime/bundle'

suite('Bundle runtime', function() {
  suite('Undefined locale uses system fallback', function() {
    test('Format message', function() {
      const value = () => ['Foo', 'Bar']
      const bundle = new Bundle(undefined, new Map([['foo', { value }]]))
      assert.equal(bundle.format('foo'), 'FooBar')
    })

    test('Format message attribute', function() {
      const value = () => ['Foo']
      const attr = { bar: () => ['Bar'] }
      const bundle = new Bundle(undefined, new Map([['foo', { value, attr }]]))
      assert.equal(bundle.format('foo.bar'), 'Bar')
    })
  })

  suite('With set locale "fi"', function() {
    test('Format message', function() {
      const value = () => ['Foo', 'Bar']
      const bundle = new Bundle(['fi'], new Map([['foo', { value }]]))
      assert.equal(bundle.format('foo'), 'FooBar')
    })
  })
})
