import { identifier, property } from 'safe-identifier'

export // Bit masks representing the state of the compiler.
const HAS_ENTRIES = 1

export class FluentJSCompiler {
  constructor({
    runtimePath = 'fluent-compiler/runtime',
    useIsolating = true,
    withJunk = false
  } = {}) {
    this.runtimePath = runtimePath
    this.useIsolating = useIsolating
    this.withJunk = withJunk
    this._exports = []
    this._varsById = {}
    this._varsByName = {}
  }

  compile(locales, resource) {
    this._exports = []
    this._varsById = {}
    this._varsByName = {}

    if (resource.type !== 'Resource') {
      throw new Error(`Unknown resource type: ${resource.type}`)
    }

    let state = 0
    const parts = []

    const lc = JSON.stringify(locales || undefined)
    parts.push(`import $Runtime from "${this.runtimePath}"\n`)
    const rt = ['$bundle', '$select', 'DATETIME', 'NUMBER']
    if (this.useIsolating) rt.unshift('$isol')
    parts.push(`const { ${rt.join(', ')} } = $Runtime(${lc})\n\n`)

    for (const entry of resource.body) {
      if (entry.type !== 'Junk' || this.withJunk) {
        parts.push(this.entry(entry, state))
        if (!(state & HAS_ENTRIES)) {
          state |= HAS_ENTRIES
        }
      }
    }

    if (this._exports.length > 0) {
      parts.push(
        `\nexport default $bundle({ ${this._exports.join(', ')} })\n`
      )
    }

    return parts.join('')
  }

  addExport(id, varName) {
    let exp
    if (id === varName) {
      exp = id
    } else {
      exp = `${property(null, id)}: ${varName}`
    }
    this._exports.push(exp)
  }

  getVarName(id, n) {
    const prev = this._varsById[id]
    if (prev) return prev
    const varName = identifier(`${id}${n || ''}`)
    if (this._varsByName[varName]) return this.getVarName(id, (n || 1) + 1)
    this._varsById[id] = varName
    this._varsByName[varName] = true
    return varName
  }

  entry(entry, state = 0) {
    switch (entry.type) {
      case 'Message':
        return this.message(entry)
      case 'Term':
        return this.term(entry)
      case 'Comment':
        if (state & HAS_ENTRIES) {
          return `\n${this.comment(entry, '//')}\n`
        }
        return `${this.comment(entry, '//')}\n`
      case 'GroupComment':
        if (state & HAS_ENTRIES) {
          return `\n${this.comment(entry, '// ##')}\n`
        }
        return `${this.comment(entry, '// ##')}\n`
      case 'ResourceComment':
        if (state & HAS_ENTRIES) {
          return `\n${this.comment(entry, '// ###')}\n`
        }
        return `${this.comment(entry, '// ###')}\n`
      case 'Junk':
        return this.junk(entry)
      default:
        throw new Error(`Unknown entry type: ${entry.type}`)
    }
  }

  comment(comment, prefix = '//') {
    const prefixed = comment.content
      .split('\n')
      .map(line => (line.length ? `${prefix} ${line}` : prefix))
      .join('\n')
    // Add the trailing newline.
    return `${prefixed}\n`
  }

  junk(junk) {
    return junk.content.replace(/^/gm, '// ')
  }

  message(message) {
    const parts = []

    if (message.comment) {
      parts.push(this.comment(message.comment))
    }

    const varName = this.getVarName(message.id.name)
    this.addExport(message.id.name, varName)
    parts.push(`const ${varName} = $ =>`)

    if (message.value) {
      parts.push(this.pattern(message.value, false))
    } else {
      parts.push(' null')
    }

    for (const attribute of message.attributes) {
      parts.push(this.attribute(varName, attribute))
    }

    parts.push('\n')
    return parts.join('')
  }

  term(term) {
    const parts = []

    if (term.comment) {
      parts.push(this.comment(term.comment))
    }

    const varName = this.getVarName(`-${term.id.name}`)
    parts.push(`const ${varName} = $ =>`)
    parts.push(this.pattern(term.value, false))

    for (const attribute of term.attributes) {
      parts.push(this.attribute(varName, attribute))
    }

    parts.push('\n')
    return parts.join('')
  }

  attribute(parentName, attribute) {
    const name = property(parentName, attribute.id.name)
    const value = this.pattern(attribute.value, false)
    return `\n${name} = $ =>${value}`
  }

  pattern(pattern, inVariant) {
    const singleElement = pattern.elements.length === 1
    const useIsolating = this.useIsolating && (inVariant || !singleElement)
    const content = []
    for (const el of pattern.elements) {
      content.push(this.element(el, useIsolating))
    }
    if (inVariant && singleElement) {
      return ` ${content[0]}`
    }
    return ` [${content.join(', ')}]`
  }

  element(element, useIsolating) {
    switch (element.type) {
      case 'TextElement':
        return JSON.stringify(element.value)
      case 'Placeable': {
        const expr = this.expression(element.expression)
        if (useIsolating) {
          return `$isol(${expr})`
        }
        return expr
      }
      default:
        throw new Error(`Unknown element type: ${element.type}`)
    }
  }

  expression(expr) {
    switch (expr.type) {
      case 'StringLiteral':
        return `"${expr.value}"`
      case 'NumberLiteral':
        return expr.value
      case 'VariableReference':
        return property('$', expr.id.name)
      case 'TermReference': {
        let out = this.getVarName(`-${expr.id.name}`)
        if (expr.attribute) {
          out = property(out, expr.attribute.name)
        }
        const args = this.callArguments(expr.arguments)
        return `${out}${args}`
      }
      case 'MessageReference': {
        let out = this.getVarName(expr.id.name)
        if (expr.attribute) {
          out = property(out, expr.attribute.name)
        }
        return `${out}($)`
      }
      case 'FunctionReference':
        return `${expr.id.name}${this.callArguments(expr.arguments)}`
      case 'SelectExpression': {
        const selector = this.expression(expr.selector)
        const defaultVariant = expr.variants.find(variant => variant.default)
        const defaultKey = JSON.stringify(this.variantKey(defaultVariant.key))
        const variants = expr.variants.map(this.variant, this).join(', ')
        return `$select(${selector}, ${defaultKey}, { ${variants} })`
      }
      case 'Placeable':
        return this.expression(expr.expression)
      default:
        throw new Error(`Unknown expression type: ${expr.type}`)
    }
  }

  variant(variant) {
    const key = this.variantKey(variant.key)
    const value = this.pattern(variant.value, true)
    return `${key}:${value}`
  }

  callArguments(expr) {
    let ctx = '$'
    if (expr && expr.named.length > 0) {
      const named = expr.named.map(this.namedArgument, this)
      ctx = `{ ...$, ${named.join(', ')} }`
    }
    if (expr && expr.positional.length > 0) {
      const positional = expr.positional.map(this.expression, this)
      return `(${ctx}, ${positional.join(', ')})`
    } else {
      return `(${ctx})`
    }
  }

  namedArgument(arg) {
    const key = property(null, arg.name.name)
    const value = this.expression(arg.value)
    return `${key}: ${value}`
  }

  variantKey(key) {
    switch (key.type) {
      case 'Identifier':
        return key.name
      case 'NumberLiteral':
        return key.value
      default:
        throw new Error(`Unknown variant key type: ${key.type}`)
    }
  }
}
