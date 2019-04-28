export default function Runtime(lc) {
  let dtf, nf, pr

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

  class FluentBundle {
    constructor(resource) {
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

    compound(id, args, errors) {
      const msg = this._res.get(id)
      try {
        if (!msg) throw new ReferenceError(`Unknown message: ${id}`)
        if (!args) args = {}
        const value = msgString(msg.value(args))
        const attributes = new Map()
        if (msg.attr) {
          for (const [attr, fn] of Object.entries(msg.attr)) {
            attributes.set(attr, msgString(fn(args)))
          }
        }
        return { value, attributes }
      } catch (err) {
        if (errors) errors.push(err)
        return { value: id, attributes: new Map() }
      }
    }

    format(id, args, errors) {
      const [msgId, attrId] = id.split('.', 2)
      const msg = this._res.get(msgId)
      try {
        if (!msg) throw new ReferenceError(`Unknown message: ${id}`)
        const fn = attrId ? msg.attr && msg.attr[attrId] : msg.value
        if (!fn) throw new ReferenceError(`No attribute called: ${attrId}`)
        return msgString(fn(args || {}))
      } catch (err) {
        if (errors) errors.push(err)
        return id
      }
    }

    hasMessage(message) {
      return message[0] !== '-' && this._res.has(message)
    }
  }

  return {
    bundle(messages) {
      return new FluentBundle(messages)
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
