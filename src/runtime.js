export default function Runtime(lc) {
  let dtf, nf, pr

  function $messages(data) {
    const bundle = {
      format(message, args, errors) {
        const fn = typeof message === 'function' ? message : data[message]
        try {
          if (!fn) throw new ReferenceError(`Unknown message: ${message}`)
          return msgString(fn(args || {}))
        } catch (err) {
          if (errors) errors.push(err)
          return message
        }
      },
      getMessage: message => data[message],
      hasMessage: message => data.hasOwnProperty(message),
      locales: [lc]
    }
    Object.defineProperty(bundle, 'messages', {
      get: () => Object.entries(data)
    })
    return bundle
  }
  function msgString(parts) {
    return parts.map(msgPart).join('')
  }
  function msgPart(part) {
    if (typeof part === 'string') {
      return part
    } else if (typeof part === 'number') {
      if (!nf) nf = new Intl.NumberFormat(lc)
      return nf.format(part)
    } else if (part instanceof Date) {
      if (!dtf) dtf = new Intl.DateTimeFormat(lc)
      return dtf.format(part)
    } else if (Array.isArray(part)) {
      return msgString(part)
    }
    return String(part)
  }

  function $select(value, def, variants) {
    if (typeof value === 'number') {
      if (!pr) pr = new Intl.PluralRules(lc)
      value = pr.select(value)
    }
    return variants.hasOwnProperty(value) ? variants[value] : variants[def]
  }

  function DATETIME($, value) {
    try {
      const _dtf = new Intl.DateTimeFormat(lc, $)
      return _dtf.format(value instanceof Date ? value : new Date(value))
    } catch (e) {
      return e instanceof RangeError ? 'Invalid Date' : value
    }
  }

  function NUMBER($, value) {
    try {
      if (isNaN(value)) return 'NaN'
      const _nf = new Intl.NumberFormat(lc, $)
      return _nf.format(value)
    } catch (e) {
      return isNaN(value) ? 'NaN' : String(value)
    }
  }

  return { $messages, $select, DATETIME, NUMBER }
}
