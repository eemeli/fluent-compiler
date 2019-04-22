import assert from 'assert'
import { FluentParser } from 'fluent-syntax'
import { ftl } from './util'

import {
  FluentJSCompiler,
  compileExpression,
  compileVariantKey
} from '../src/compiler'

function trimModuleHeaders(source) {
  return source
    .replace(/^import .Runtime from .*\n/, '')
    .replace(/^const { .* } = .Runtime.*\n\n/, '')
}

suite('Compile resource', function() {
  let pretty

  setup(function() {
    const parser = new FluentParser()
    const compiler = new FluentJSCompiler({
      withJunk: false
    })

    pretty = function pretty(text) {
      const res = parser.parse(text)
      return trimModuleHeaders(compiler.compile(undefined, res))
    }
  })

  test('invalid resource', function() {
    const compiler = new FluentJSCompiler()
    assert.throws(
      () => compiler.compile(undefined, null),
      /Cannot read property 'type'/
    )
    assert.throws(
      () => compiler.compile(undefined, {}),
      /Unknown resource type/
    )
  })

  test('simple message', function() {
    const input = ftl`
      foo = Foo
    `
    const output = ftl`
      const foo = $ => ["Foo"]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('simple term', function() {
    const input = ftl`
      -foo = Foo
    `
    const output = ftl`
      const _foo = $ => ["Foo"]
    `
    assert.equal(pretty(input), output)
  })

  test('two simple messages', function() {
    const input = ftl`
      foo = Foo
      bar = Bar
    `
    const output = ftl`
      const foo = $ => ["Foo"]
      const bar = $ => ["Bar"]

      export default $messages({ foo, bar })
    `
    assert.equal(pretty(input), output)
  })

  test('block multiline message', function() {
    const input = ftl`
      foo =
          Foo
          Bar
    `
    const output = ftl`
      const foo = $ => ["Foo\\nBar"]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('inline multiline message', function() {
    const input = ftl`
      foo = Foo
          Bar
    `
    const output = ftl`
      const foo = $ => ["Foo\\nBar"]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('message reference', function() {
    const input = ftl`
      foo = Foo { bar }
    `
    const output = ftl`
      const foo = $ => ["Foo ", bar($)]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('term reference', function() {
    const input = ftl`
      foo = Foo { -bar }
    `
    const output = ftl`
      const foo = $ => ["Foo ", _bar($)]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('external argument', function() {
    const input = ftl`
      foo = Foo { $bar }
    `
    const output = ftl`
      const foo = $ => ["Foo ", $.bar]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('number element', function() {
    const input = ftl`
      foo = Foo { 1 }
    `
    const output = ftl`
      const foo = $ => ["Foo ", 1]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('string element', function() {
    const input = ftl`
      foo = Foo { "bar" }
    `
    const output = ftl`
      const foo = $ => ["Foo ", "bar"]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('attribute expression', function() {
    const input = ftl`
      foo = Foo { bar.baz }
    `
    const output = ftl`
      const foo = $ => ["Foo ", bar.baz($)]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('resource comment', function() {
    const input = ftl`
      ### A multiline
      ### resource comment.

      foo = Foo
    `
    const output = ftl`
      // ### A multiline
      // ### resource comment.

      const foo = $ => ["Foo"]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('message comment', function() {
    const input = ftl`
      # A multiline
      # message comment.
      foo = Foo
    `
    const output = ftl`
      // A multiline
      // message comment.
      const foo = $ => ["Foo"]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('group comment', function() {
    const input = ftl`
      foo = Foo

      ## Comment Header
      ##
      ## A multiline
      ## group comment.

      bar = Bar
    `
    const output = ftl`
      const foo = $ => ["Foo"]

      // ## Comment Header
      // ##
      // ## A multiline
      // ## group comment.

      const bar = $ => ["Bar"]

      export default $messages({ foo, bar })
    `
    assert.equal(pretty(input), output)
  })

  test('standalone comment', function() {
    const input = ftl`
      foo = Foo

      # A Standalone Comment

      bar = Bar
    `
    const output = ftl`
      const foo = $ => ["Foo"]

      // A Standalone Comment

      const bar = $ => ["Bar"]

      export default $messages({ foo, bar })
    `
    assert.equal(pretty(input), output)
  })

  test('multiline with placeable', function() {
    const input = ftl`
      foo =
          Foo { bar }
          Baz
    `
    const output = ftl`
      const foo = $ => ["Foo ", bar($), "\\nBaz"]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('attribute', function() {
    const input = ftl`
      foo =
          .attr = Foo Attr
    `
    const output = ftl`
      const foo = $ => null
      foo.attr = $ => ["Foo Attr"]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('multiline attribute', function() {
    const input = ftl`
      foo =
          .attr =
              Foo Attr
              Continued
    `
    const output = ftl`
      const foo = $ => null
      foo.attr = $ => ["Foo Attr\\nContinued"]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('two attributes', function() {
    const input = ftl`
      foo =
          .attr-a = Foo Attr A
          .attr-b = Foo Attr B
    `
    const output = ftl`
      const foo = $ => null
      foo["attr-a"] = $ => ["Foo Attr A"]
      foo["attr-b"] = $ => ["Foo Attr B"]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('value and attributes', function() {
    const input = ftl`
      foo = Foo Value
          .attr-a = Foo Attr A
          .attr-b = Foo Attr B
    `
    const output = ftl`
      const foo = $ => ["Foo Value"]
      foo["attr-a"] = $ => ["Foo Attr A"]
      foo["attr-b"] = $ => ["Foo Attr B"]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('multiline value and attributes', function() {
    const input = ftl`
      foo =
          Foo Value
          Continued
          .attr-a = Foo Attr A
          .attr-b = Foo Attr B
    `
    const output = ftl`
      const foo = $ => ["Foo Value\\nContinued"]
      foo["attr-a"] = $ => ["Foo Attr A"]
      foo["attr-b"] = $ => ["Foo Attr B"]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('select expression', function() {
    const input = ftl`
      foo =
          { $sel ->
             *[a] A
              [b] B
          }
    `
    const output = ftl`
      const foo = $ => [$select($.sel, "a", { a: "A", b: "B" })]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('multiline variant', function() {
    const input = ftl`
      foo =
          { $sel ->
             *[a]
                  AAA
                  BBB
          }
    `
    const output = ftl`
      const foo = $ => [$select($.sel, "a", { a: "AAA\\nBBB" })]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('multiline variant with first line inline', function() {
    const input = ftl`
      foo =
          { $sel ->
             *[a] AAA
                  BBB
          }
    `
    const output = ftl`
      const foo = $ => [$select($.sel, "a", { a: "AAA\\nBBB" })]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('variant key number', function() {
    const input = ftl`
      foo =
          { $sel ->
             *[1] 1
          }
    `
    const output = ftl`
      const foo = $ => [$select($.sel, "1", { 1: "1" })]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('select expression in block value', function() {
    const input = ftl`
      foo =
          Foo { $sel ->
             *[a] A
              [b] B
          }
    `
    const output = ftl`
      const foo = $ => ["Foo ", $select($.sel, "a", { a: "A", b: "B" })]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('select expression in inline value', function() {
    const input = ftl`
      foo = Foo { $sel ->
             *[a] A
              [b] B
          }
    `
    const output = ftl`
      const foo = $ => ["Foo ", $select($.sel, "a", { a: "A", b: "B" })]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('select expression in multiline value', function() {
    const input = ftl`
      foo =
          Foo
          Bar { $sel ->
             *[a] A
              [b] B
          }
    `
    const output = ftl`
      const foo = $ => ["Foo\\nBar ", $select($.sel, "a", { a: "A", b: "B" })]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('nested select expression', function() {
    const input = ftl`
      foo =
          { $a ->
             *[a]
                  { $b ->
                     *[b] Foo
                  }
          }
    `
    const output = ftl`
      const foo = $ => [$select($.a, "a", { a: $select($.b, "b", { b: "Foo" }) })]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('selector external argument', function() {
    const input = ftl`
      foo =
          { $bar ->
             *[a] A
          }
    `
    const output = ftl`
      const foo = $ => [$select($.bar, "a", { a: "A" })]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('selector number expression', function() {
    const input = ftl`
      foo =
          { 1 ->
             *[a] A
          }
    `
    const output = ftl`
      const foo = $ => [$select(1, "a", { a: "A" })]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('selector string expression', function() {
    const input = ftl`
      foo =
          { "bar" ->
             *[a] A
          }
    `
    const output = ftl`
      const foo = $ => [$select("bar", "a", { a: "A" })]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('selector attribute expression', function() {
    const input = ftl`
      foo =
          { -bar.baz ->
             *[a] A
          }
    `
    const output = ftl`
      const foo = $ => [$select(_bar.baz($), "a", { a: "A" })]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('call expression', function() {
    const input = ftl`
      foo = { FOO() }
    `
    const output = ftl`
      const foo = $ => [FOO($)]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('call expression with string expression', function() {
    const input = ftl`
      foo = { FOO("bar") }
    `
    const output = ftl`
      const foo = $ => [FOO($, "bar")]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('call expression with number expression', function() {
    const input = ftl`
      foo = { FOO(1) }
    `
    const output = ftl`
      const foo = $ => [FOO($, 1)]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('call expression with message reference', function() {
    const input = ftl`
      foo = { FOO(bar) }
    `
    const output = ftl`
      const foo = $ => [FOO($, bar($))]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('call expression with external argument', function() {
    const input = ftl`
      foo = { FOO($bar) }
    `
    const output = ftl`
      const foo = $ => [FOO($, $.bar)]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('call expression with number named argument', function() {
    const input = ftl`
      foo = { FOO(bar: 1) }
    `
    const output = ftl`
      const foo = $ => [FOO({ ...$, bar: 1 })]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('call expression with string named argument', function() {
    const input = ftl`
      foo = { FOO(bar: "bar") }
    `
    const output = ftl`
      const foo = $ => [FOO({ ...$, bar: "bar" })]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('call expression with two positional arguments', function() {
    const input = ftl`
      foo = { FOO(bar, baz) }
    `
    const output = ftl`
      const foo = $ => [FOO($, bar($), baz($))]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('call expression with two named arguments', function() {
    const input = ftl`
      foo = { FOO(bar: "bar", baz: "baz") }
    `
    const output = ftl`
      const foo = $ => [FOO({ ...$, bar: "bar", baz: "baz" })]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('call expression with positional and named arguments', function() {
    const input = ftl`
      foo = { FOO(bar, 1, baz: "baz") }
    `
    const output = ftl`
      const foo = $ => [FOO({ ...$, baz: "baz" }, bar($), 1)]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('macro call', function() {
    const input = ftl`
      foo = { -term() }
    `
    const output = ftl`
      const foo = $ => [_term($)]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('nested placeables', function() {
    const input = ftl`
      foo = {{ FOO() }}
    `
    const output = ftl`
      const foo = $ => [FOO($)]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('Backslash in TextElement', function() {
    const input = ftl`
      foo = \\{ placeable }
    `
    const output = ftl`
      const foo = $ => ["\\\\", placeable($)]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('Escaped special char in StringLiteral', function() {
    const input = ftl`
      foo = { "Escaped \\" quote" }
    `
    const output = ftl`
      const foo = $ => ["Escaped \\" quote"]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })

  test('Unicode escape sequence', function() {
    const input = ftl`
      foo = { "\\u0065" }
    `
    const output = ftl`
      const foo = $ => ["\\u0065"]

      export default $messages({ foo })
    `
    assert.equal(pretty(input), output)
  })
})

suite('compileExpression', function() {
  let pretty

  setup(function() {
    const parser = new FluentParser()

    pretty = function pretty(text) {
      const {
        value: {
          elements: [placeable]
        }
      } = parser.parseEntry(text)
      return compileExpression(placeable.expression)
    }
  })

  test('invalid expression', function() {
    assert.throws(() => compileExpression(null), /Cannot read property 'type'/)
    assert.throws(() => compileExpression({}), /Unknown expression type/)
  })

  test('string expression', function() {
    const input = ftl`
      foo = { "str" }
    `
    assert.equal(pretty(input), '"str"')
  })

  test('number expression', function() {
    const input = ftl`
      foo = { 3 }
    `
    assert.equal(pretty(input), '3')
  })

  test('message reference', function() {
    const input = ftl`
      foo = { msg }
    `
    assert.equal(pretty(input), 'msg($)')
  })

  test('external argument', function() {
    const input = ftl`
      foo = { $ext }
    `
    assert.equal(pretty(input), '$.ext')
  })

  test('attribute expression', function() {
    const input = ftl`
      foo = { msg.attr }
    `
    assert.equal(pretty(input), 'msg.attr($)')
  })

  test('call expression', function() {
    const input = ftl`
      foo = { BUILTIN(3.14, kwarg: "value") }
    `
    assert.equal(pretty(input), 'BUILTIN({ ...$, kwarg: "value" }, 3.14)')
  })

  test('select expression', function() {
    const input = ftl`
      foo =
          { $num ->
              *[one] One
          }
    `
    assert.equal(pretty(input), '$select($.num, "one", { one: "One" })')
  })
})

suite('Compile padding around comments', function() {
  let pretty

  setup(function() {
    const parser = new FluentParser()
    const compiler = new FluentJSCompiler({
      withJunk: false
    })

    pretty = function pretty(text) {
      const res = parser.parse(text)
      return trimModuleHeaders(compiler.compile(undefined, res))
    }
  })

  test('standalone comment has not padding when first', function() {
    const input = ftl`
      # Comment A

      foo = Foo

      # Comment B

      bar = Bar
    `
    const output = ftl`
      // Comment A

      const foo = $ => ["Foo"]

      // Comment B

      const bar = $ => ["Bar"]

      export default $messages({ foo, bar })
    `
    assert.equal(pretty(input), output)
    // Run again to make sure the same instance of the compiler doesn't keep
    // state about how many entires is has already compiled.
    assert.equal(pretty(input), output)
  })

  test('group comment has not padding when first', function() {
    const input = ftl`
      ## Group A

      foo = Foo

      ## Group B

      bar = Bar
    `
    const output = ftl`
      // ## Group A

      const foo = $ => ["Foo"]

      // ## Group B

      const bar = $ => ["Bar"]

      export default $messages({ foo, bar })
    `
    assert.equal(pretty(input), output)
    assert.equal(pretty(input), output)
  })

  test('resource comment has not padding when first', function() {
    const input = ftl`
      ### Resource Comment A

      foo = Foo

      ### Resource Comment B

      bar = Bar
    `
    const output = ftl`
      // ### Resource Comment A

      const foo = $ => ["Foo"]

      // ### Resource Comment B

      const bar = $ => ["Bar"]

      export default $messages({ foo, bar })
    `
    assert.equal(pretty(input), output)
    assert.equal(pretty(input), output)
  })
})

suite('compileVariantKey', function() {
  let prettyVariantKey

  setup(function() {
    let parser = new FluentParser()

    prettyVariantKey = function(text, index) {
      let pattern = parser.parseEntry(text).value
      let variants = pattern.elements[0].expression.variants
      return compileVariantKey(variants[index].key)
    }
  })

  test('invalid expression', function() {
    assert.throws(() => compileVariantKey(null), /Cannot read property 'type'/)
    assert.throws(() => compileVariantKey({}), /Unknown variant key type/)
  })

  test('identifiers', function() {
    const input = ftl`
      foo = { $num ->
          [one] One
         *[other] Other
      }
    `
    assert.equal(prettyVariantKey(input, 0), 'one')
    assert.equal(prettyVariantKey(input, 1), 'other')
  })

  test('number literals', function() {
    const input = ftl`
      foo = { $num ->
          [-123456789] Minus a lot
          [0] Zero
         *[3.14] Pi
          [007] James
      }
    `
    assert.equal(prettyVariantKey(input, 0), '-123456789')
    assert.equal(prettyVariantKey(input, 1), '0')
    assert.equal(prettyVariantKey(input, 2), '3.14')
    assert.equal(prettyVariantKey(input, 3), '007')
  })
})