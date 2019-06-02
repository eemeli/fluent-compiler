import { source } from 'common-tags'
import compiler from './es6-compiler'

test('Simple FTL', async () => {
  const js = await compiler('fixtures/simple.ftl')
  expect(js).toBe(source`
    import Runtime from "fluent-compiler/runtime"
    const { bundle, isol } = Runtime(["en-US"])
    const R = new Map([

    ["hello-user", { value: $ => ["Hello, ", isol($.userName), "!"] }],

    ])
    export const resource = R
    export default bundle(R)
  `)
})

test('Complex FTL with options', async () => {
  const js = await compiler('fixtures/complex.ftl', { useIsolating: false })
  expect(js).toBe(source`
    import Runtime from "fluent-compiler/runtime"
    const { bundle, select } = Runtime(["en-US"])
    const R = new Map([

    // Simple things are simple.
    ["hello-user", { value: $ => ["Hello, ", $.userName, "!"] }],
    // Complex things are possible.
    ["shared-photos", { value: $ => [$.userName, " ", select($.photoCount, "other", { one: "added a new photo", other: ["added ", $.photoCount, " new photos"] }), " to ", select($.userGender, "other", { male: "his stream", female: "her stream", other: "their stream" }), "."] }],

    ])
    export const resource = R
    export default bundle(R)
  `)
})

describe('Options', () => {
  test('locales: ["en-ZA"], useIsolating: false', async () => {
    const js = await compiler('fixtures/simple.ftl', {
      locales: ['en-ZA'],
      useIsolating: false
    })
    expect(js).toBe(source`
      import Runtime from "fluent-compiler/runtime"
      const { bundle } = Runtime(["en-ZA"])
      const R = new Map([

      ["hello-user", { value: $ => ["Hello, ", $.userName, "!"] }],

      ])
      export const resource = R
      export default bundle(R)
    `)
  })

  test('locales: no match', async () => {
    const js = await compiler('fixtures/simple.ftl', {
      locales: ['foo', 'bar']
    })
    expect(js).toMatch(`const { bundle, isol } = Runtime(["foo"])`)
  })

  test('locales: filename match', async () => {
    const js = await compiler('fixtures/simple.ftl', {
      locales: ['foo', 'simple']
    })
    expect(js).toMatch(`const { bundle, isol } = Runtime(["simple"])`)
  })

  test('locales: empty', async () => {
    try {
      await compiler('fixtures/simple.ftl', { locales: [] })
      throw new Error('Expected compiler call to fail!')
    } catch (err) {
      expect(err.message).toMatch('If set, `locales` must be a non-empty array')
    }
  })
})
