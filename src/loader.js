import { compile } from 'fluent-compiler'
import { getOptions } from 'loader-utils'

function getLocale({ query, request, rootContext }, locales) {
  if (locales.length === 1) return locales
  let req = request.replace(/.*!/, '').replace(rootContext, '')
  if (query && typeof query === 'string') req = req.replace(query, '')
  const parts = req.split(/[._/]/)
  for (let i = parts.length - 1; i >= 0; --i) {
    const part = parts[i]
    if (part && locales.includes(part)) return [part]
  }
  return [locales[0]]
}

export default function(source) {
  const { locales = ['en-US'], ...options } = getOptions(this) || {}
  return Array.isArray(locales) && locales.length > 0
    ? compile(getLocale(this, locales), source, options)
    : this.emitError(new Error('If set, `locales` must be a non-empty array'))
}
