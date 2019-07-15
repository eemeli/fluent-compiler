import 'intl-pluralrules' // For Node 8
import compiler from './es5-compiler'

function getBundle(src) {
  const fn = new Function('module', src)
  const mod = {}
  fn(mod)
  expect(mod).toMatchObject({ exports: { default: {} } })
  return mod.exports.default
}

test('Simple FTL', async () => {
  const js = await compiler('fixtures/simple.ftl', { useIsolating: false })
  const bundle = getBundle(js)
  expect(typeof bundle.formatPattern).toBe('function')
  expect(typeof bundle.getMessage).toBe('function')
  const msg = bundle.getMessage('hello-user')
  expect(msg).toMatchObject({ value: {} })

  let res, errors
  res = bundle.formatPattern(msg.value, { userName: 'USER' }, errors = [])
  expect(errors).toHaveLength(0)
  expect(res).toBe('Hello, USER!')

  res = bundle.formatPattern(msg.value, {}, errors = [])
  expect(errors).toHaveLength(0)
  expect(res).toBe('Hello, undefined!')

  res = bundle.formatPattern(msg.value, null, errors = [])
  expect(errors).toHaveLength(0)
  expect(res).toBe('Hello, undefined!')
})

test('Complex FTL', async () => {
  const js = await compiler('fixtures/complex.ftl', { useIsolating: false })
  const bundle = getBundle(js)
  expect(typeof bundle.formatPattern).toBe('function')
  expect(typeof bundle.getMessage).toBe('function')
  const testData = {
    photoCount: 1,
    userGender: 'female',
    userName: 'USER'
  }

  let msg, res, errors
  msg = bundle.getMessage('hello-user')
  res = bundle.formatPattern(msg.value, testData, errors = [])
  expect(errors).toHaveLength(0)
  expect(res).toBe('Hello, USER!')

  msg = bundle.getMessage('shared-photos')
  errors = []
  res = bundle.formatPattern(msg.value, testData, errors = [])
  expect(errors).toHaveLength(0)
  expect(res).toBe('USER added a new photo to her stream.')
})
