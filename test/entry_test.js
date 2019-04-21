import assert from 'assert'
import { ftl } from './util'

import { FluentSerializer } from '../src/serializer'

suite('Serialize entry', function() {
  setup(function() {
    this.serializer = new FluentSerializer()
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
      foo = Foo
    `

    const message = this.serializer.serializeEntry(input)
    assert.deepEqual(message, output)
  })
})
