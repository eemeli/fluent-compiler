import assert from 'assert'

import { FluentCompiler } from '../src'

suite('Compile entry', function() {
  setup(function() {
    this.compiler = new FluentCompiler()
  })

  test('simple message', function() {
    const input = {
      comment: null,
      value: {
        elements: [
          {
            type: 'TextElement',
            value: 'Foo'
          }
        ],
        type: 'Pattern'
      },
      attributes: [],
      type: 'Message',
      id: {
        type: 'Identifier',
        name: 'foo'
      }
    }
    const output = '["foo", { value: $ => ["Foo"] }],'
    const message = this.compiler.entry(input)
    assert.equal(message, output)
  })
})
