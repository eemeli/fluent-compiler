import { dtf, nf, pr } from './intl-memo'

export default function Runtime(lc) {
  return {
    isol(expr) {
      // Unicode bidi isolation characters.
      const FSI = '\u2068'
      const PDI = '\u2069'
      return Array.isArray(expr) ? [FSI].concat(expr, PDI) : [FSI, expr, PDI]
    },

    select(value, def, variants) {
      if (value && value.$) {
        if (variants.hasOwnProperty(value.fmt)) return variants[value.fmt]
        const cat = pr(lc, value.value, value.$)
        return variants.hasOwnProperty(cat) ? variants[cat] : variants[def]
      }
      if (variants.hasOwnProperty(value)) return variants[value]
      if (typeof value === 'number') {
        const cat = pr(lc, value)
        if (variants.hasOwnProperty(cat)) return variants[cat]
      }
      return variants[def]
    },

    DATETIME($, value) {
      try {
        return dtf(lc, value instanceof Date ? value : new Date(value), $)
      } catch (e) {
        return e instanceof RangeError ? 'Invalid Date' : value
      }
    },

    NUMBER($, value) {
      if (isNaN(value)) return 'NaN'
      try {
        return { $, value, fmt: nf(lc, value, $) }
      } catch (e) {
        return String(value)
      }
    }
  }
}
