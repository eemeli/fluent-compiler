import { compile } from 'fluent-compiler'
import { getOptions } from 'loader-utils'

function getLocaleFromFilename({ query, request, rootContext }, locales) {
  let req = request.replace(/.*!/, '').replace(rootContext, '')
  if (query && typeof query === 'string') req = req.replace(query, '')
  const parts = req.split(/[._/]/)
  for (let i = parts.length - 1; i >= 0; --i) {
    const part = parts[i]
    if (part && locales.includes(part)) return [part]
  }
  return locales
}

export default function(source) {
  const { defaultLocale = 'en-US', locales = [], ...options } =
    getOptions(this) || {}
  let lc
  switch (locales.length) {
    case 0:
      lc = [defaultLocale]
      break
    case 1:
      lc = locales
      break
    default:
      lc = getLocaleFromFilename(this, locales)
  }
  return compile(lc, source, options)
}
