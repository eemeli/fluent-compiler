export default function Runtime(lc) {
  let dtf, nf, pr

  function $messages(data) {
    const bundle = {
      addResource(resource, opt) {
        const ao = (opt && opt.allowOverrides) || false
        const err = []
        for (const [id, msg] of resource) {
          if (!ao && data.hasOwnProperty(id)) {
            err.push(`Attempt to override an existing message: "${id}"`)
          } else {
            data[id] = msg
          }
        }
        return err
      },
      compound(id, args, errors) {
        const fn = data[id]
        if (!fn) {
          if (errors) errors.push(new ReferenceError(`Unknown message: ${id}`))
          return { value: id, attributes: new Map() }
        }
        if (!args) args = {}
        const value = msgString(fn(args))
        const attr = Object.keys(fn).map(an => [an, msgString(fn[an](args))])
        return { value, attributes: new Map(attr) }
      },
      format(id, args, errors) {
        const [msg, attr] = id.split('.', 2)
        let fn = data[msg]
        if (attr) fn = fn.hasOwnProperty(attr) && fn[attr]
        try {
          if (!fn) throw new ReferenceError(`Unknown message: ${id}`)
          return msgString(fn(args || {}))
        } catch (err) {
          if (errors) errors.push(err)
          return id
        }
      },
      hasMessage: message => data.hasOwnProperty(message),
      locales: Array.isArray(lc) ? lc : [lc]
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
    switch (typeof part) {
      case 'string':
        return part
      case 'number':
        if (!nf) nf = new Intl.NumberFormat(lc)
        return nf.format(part)
      case 'object':
        if (part instanceof Date) {
          if (!dtf) dtf = new Intl.DateTimeFormat(lc)
          return dtf.format(part)
        } else if (Array.isArray(part)) {
          return msgString(part)
        } else if (part && part.$) {
          return part.fmt
        }
    }
    return String(part)
  }

  function $select(value, def, variants) {
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
    if (isNaN(value)) return 'NaN'
    try {
      const _nf = new Intl.NumberFormat(lc, $)
      return { $, value, fmt: _nf.format(value) }
    } catch (e) {
      return String(value)
    }
  }

  return { $messages, $select, DATETIME, NUMBER }
}
