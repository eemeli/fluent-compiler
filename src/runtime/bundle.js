const dtf = lc => dtf[lc] || (dtf[lc] = new Intl.DateTimeFormat(lc))
const nf = lc => nf[lc] || (nf[lc] = new Intl.NumberFormat(lc))

//const key = (lc, opt) => `${lc} ${Object.entries(opt || {})}`
//function dtf(lc, opt) {
//  const k = key(lc, opt)
//  return dtf[k] || (dtf[k] = new Intl.DateTimeFormat(lc, opt))
//}

function msgString(lc, parts) {
  return parts
    .map(part => {
      switch (typeof part) {
        case 'string':
          return part
        case 'number':
          return nf(lc).format(part)
        case 'object':
          if (part instanceof Date) {
            return dtf(lc).format(part)
          } else if (Array.isArray(part)) {
            return msgString(lc, part)
          } else if (part && part.$) {
            return part.fmt
          }
      }
      return String(part)
    })
    .join('')
}

export default class FluentBundle {
  constructor(lc, resource) {
    this._res = resource
    this.locales = Array.isArray(lc) ? lc : [lc]
  }

  addResource(resource, opt) {
    const ao = (opt && opt.allowOverrides) || false
    const err = []
    for (const [id, msg] of resource) {
      if (!ao && this._res.has(id)) {
        err.push(`Attempt to override an existing message: "${id}"`)
      } else {
        this._res.set(id, msg)
      }
    }
    return err
  }

  formatPattern(pattern, args, errors) {
    try {
      const parts = pattern(args || {})
      return msgString(this.locales, parts)
    } catch (err) {
      if (errors) errors.push(err)
      return null
    }
  }

  getMessage(id) {
    return id[0] !== '-' && this._res.get(id)
  }

  hasMessage(id) {
    return id[0] !== '-' && this._res.has(id)
  }
}
