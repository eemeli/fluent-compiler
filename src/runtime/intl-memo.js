function memo(name, lc, opt) {
  let k = `${name} ${lc} `
  if (opt) k += Object.entries(opt)
  return memo[k] || (memo[k] = new Intl[name](lc, opt))
}

/** new Intl.DateTimeFormat(lc, opt).format(val) */
export const dtf = (lc, val, opt) => memo('DateTimeFormat', lc, opt).format(val)

/** new Intl.NumberFormat(lc, opt).format(val) */
export const nf = (lc, val, opt) => memo('NumberFormat', lc, opt).format(val)

/** new Intl.PluralRules(lc, opt).select(val) */
export const pr = (lc, val, opt) => memo('PluralRules', lc, opt).select(val)
