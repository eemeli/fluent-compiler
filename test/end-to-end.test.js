import 'intl-pluralrules' // For Node 8
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

  let errors = []
  let res = bundle.format('hello-user', { userName: 'USER' }, errors)
  expect(errors).toHaveLength(0)
  expect(res).toBe('Hello, USER!')

  errors = []
  res = bundle.format('hello-user', {}, errors)
  expect(errors).toHaveLength(0)
  expect(res).toBe('Hello, undefined!')

  errors = []
  res = bundle.format('hello-user', null, errors)
  expect(errors).toHaveLength(0)
  expect(res).toBe('Hello, undefined!')
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

  let errors = []
  let res = bundle.format('hello-user', testData, errors)
  expect(errors).toHaveLength(0)
  expect(res).toBe('Hello, USER!')

  errors = []
  res = bundle.format('shared-photos', testData, errors)
  expect(errors).toHaveLength(0)
  expect(res).toBe('USER added a new photo to her stream.')
})
