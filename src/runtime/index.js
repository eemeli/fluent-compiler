import FluentBundle from './bundle'

export default function Runtime(lc) {
  let pr

  return {
    bundle(messages) {
      return new FluentBundle(lc, messages)
    },

    isol(expr) {
      // Unicode bidi isolation characters.
      const FSI = '\u2068'
      const PDI = '\u2069'
      return Array.isArray(expr) ? [FSI].concat(expr, PDI) : [FSI, expr, PDI]
    },

    select(value, def, variants) {
      if (value && value.$) {
        if (variants.hasOwnProperty(value.fmt)) return variants[value.fmt]
        const _pr = new Intl.PluralRules(lc, value.$)
        const cat = _pr.select(value.value)
        return variants.hasOwnProperty(cat) ? variants[cat] : variants[def]
      }
      if (variants.hasOwnProperty(value)) return variants[value]
      if (typeof value === 'number') {
        if (!pr) pr = new Intl.PluralRules(lc)
        const cat = pr.select(value)
        if (variants.hasOwnProperty(cat)) return variants[cat]
      }
      return variants[def]
    },

    DATETIME($, value) {
      try {
        const _dtf = new Intl.DateTimeFormat(lc, $)
        return _dtf.format(value instanceof Date ? value : new Date(value))
      } catch (e) {
        return e instanceof RangeError ? 'Invalid Date' : value
      }
    },

    NUMBER($, value) {
      if (isNaN(value)) return 'NaN'
      try {
        const _nf = new Intl.NumberFormat(lc, $)
        return { $, value, fmt: _nf.format(value) }
      } catch (e) {
        return String(value)
      }
    }
  }
}
