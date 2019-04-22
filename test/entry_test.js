import assert from 'assert'
import { ftl } from './util'

import { FluentJSCompiler } from '../src/serializer'

suite('Compile entry', function() {
  setup(function() {
    this.compiler = new FluentJSCompiler()
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
    const output = ftl`
      const foo = $ => ["Foo"]
    `

    const message = this.compiler.compileEntry(input)
    assert.deepEqual(message, output)
  })
})
