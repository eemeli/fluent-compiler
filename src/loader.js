import { compile } from 'fluent-compiler'
import { getOptions } from 'loader-utils'

export default function(source) {
  const { locale = 'en-US', locales = [], ...options } = getOptions(this) || {}
  if (locales.length === 0) locales.push(locale)
  return compile(locales, source, options)
}
