import { compile } from 'fluent-compiler'
import { getOptions } from 'loader-utils'

/**
 * Matches file path parts (separated by [._/]) to known locales. Looks first
 * for full locale names, then for root locale names, e.g. first looking for
 * `en-US` and then for `en`.
 *
 * @param {Context} ctx The loader context object, available as its `this`
 * @param {string[]} locales Available locales
 * @returns {string} The identified locale, or `locales[0]` on failure
 */
function getLocale({ resourcePath, rootContext }, locales) {
  if (locales.length === 1) return locales[0]
  const parts = resourcePath
    .replace(rootContext, '')
    .split(/[._/]/)
    .filter(Boolean)
    .reverse()
  for (const part of parts) if (locales.includes(part)) return part
  const topLocales = locales.reduce((top, lc) => {
    const i = lc.indexOf('-')
    return i > 0 ? top.concat(lc.slice(0, i)) : top
  }, [])
  if (topLocales.length > 0) {
    for (const part of parts) if (topLocales.includes(part)) return part
  }
  return locales[0]
}

export default function(source) {
  const { locales = ['en-US'], ...options } = getOptions(this) || {}
  if (Array.isArray(locales) && locales.length > 0) {
    const lc = getLocale(this, locales)
    return compile([lc], source, options)
  } else {
    this.emitError(new Error('If set, `locales` must be a non-empty array'))
  }
}
