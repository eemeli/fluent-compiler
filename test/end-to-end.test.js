import compiler from './es5-compiler'

function getBundle(src) {
  const fn = new Function('module', src)
  const mod = {}
  fn(mod)
  expect(mod).toMatchObject({ exports: { default: {}, resource: {} } })
  return mod.exports.default
}

test('Simple FTL', async () => {
  const js = await compiler('fixtures/simple.ftl', { useIsolating: false })
  const bundle = getBundle(js)
  expect(typeof bundle.format).toBe('function')
  expect(bundle.format('hello-user', { userName: 'USER' })).toBe('Hello, USER!')
  expect(bundle.format('hello-user', {})).toBe('Hello, undefined!')
  expect(bundle.format('hello-user')).toBe('Hello, undefined!')
})

test('Complex FTL', async () => {
  const js = await compiler('fixtures/complex.ftl', { useIsolating: false })
  const bundle = getBundle(js)
  expect(typeof bundle.format).toBe('function')
  const testData = {
    photoCount: 1,
    userGender: 'female',
    userName: 'USER'
  }
  expect(bundle.format('hello-user', testData)).toBe('Hello, USER!')
  expect(bundle.format('shared-photos', testData)).toBe(
    'USER added a new photo to her stream.'
  )
})
