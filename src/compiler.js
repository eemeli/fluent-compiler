import { identifier, property } from 'safe-identifier'

function indent(content) {
  return content.split('\n').join('\n    ')
}

export // Bit masks representing the state of the compiler.
const HAS_ENTRIES = 1

export class FluentJSCompiler {
  constructor({ withJunk = false } = {}) {
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
    parts.push('import $Runtime from "fluent-compiler/runtime"\n')
    parts.push(
      `const { $messages, $select, DATETIME, NUMBER } = $Runtime(${lc})\n\n`
    )

    for (const entry of resource.body) {
      if (entry.type !== 'Junk' || this.withJunk) {
        parts.push(this.compileEntry(entry, state))
        if (!(state & HAS_ENTRIES)) {
          state |= HAS_ENTRIES
        }
      }
    }

    if (this._exports.length > 0) {
      parts.push(
        `\nexport default $messages({ ${this._exports.join(', ')} })\n`
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

  compileEntry(entry, state = 0) {
    switch (entry.type) {
      case 'Message':
        return this.compileMessage(entry)
      case 'Term':
        return this.compileTerm(entry)
      case 'Comment':
        if (state & HAS_ENTRIES) {
          return `\n${this.compileComment(entry, '//')}\n`
        }
        return `${this.compileComment(entry, '//')}\n`
      case 'GroupComment':
        if (state & HAS_ENTRIES) {
          return `\n${this.compileComment(entry, '// ##')}\n`
        }
        return `${this.compileComment(entry, '// ##')}\n`
      case 'ResourceComment':
        if (state & HAS_ENTRIES) {
          return `\n${this.compileComment(entry, '// ###')}\n`
        }
        return `${this.compileComment(entry, '// ###')}\n`
      case 'Junk':
        return this.compileJunk(entry)
      default:
        throw new Error(`Unknown entry type: ${entry.type}`)
    }
  }

  compileComment(comment, prefix = '//') {
    const prefixed = comment.content
      .split('\n')
      .map(line => (line.length ? `${prefix} ${line}` : prefix))
      .join('\n')
    // Add the trailing newline.
    return `${prefixed}\n`
  }

  compileJunk(junk) {
    return junk.content.replace(/^/gm, '// ')
  }

  compileMessage(message) {
    const parts = []

    if (message.comment) {
      parts.push(this.compileComment(message.comment))
    }

    const varName = this.getVarName(message.id.name)
    this.addExport(message.id.name, varName)
    parts.push(`const ${varName} = $ =>`)

    if (message.value) {
      parts.push(this.compilePattern(message.value))
    } else {
      parts.push(' null')
    }

    for (const attribute of message.attributes) {
      parts.push(this.compileAttribute(varName, attribute))
    }

    parts.push('\n')
    return parts.join('')
  }

  compileTerm(term) {
    const parts = []

    if (term.comment) {
      parts.push(this.compileComment(term.comment))
    }

    const varName = this.getVarName(`-${term.id.name}`)
    parts.push(`const ${varName} = $ =>`)
    parts.push(this.compilePattern(term.value))

    for (const attribute of term.attributes) {
      parts.push(this.compileAttribute(varName, attribute))
    }

    parts.push('\n')
    return parts.join('')
  }

  compileAttribute(parentName, attribute) {
    const name = property(parentName, attribute.id.name)
    const value = indent(this.compilePattern(attribute.value))
    return `\n${name} = $ =>${value}`
  }

  compilePattern(pattern) {
    const content = pattern.elements.map(this.compileElement, this)
    const contentLength = content.reduce(
      (len, c) => len + c.length,
      (content.length - 1) * 2
    )
    const startOnNewLine = contentLength > 60
    if (startOnNewLine) {
      return `[\n    ${indent(content.join(',\n'))}\n]`
    }
    return ` [${content.join(', ')}]`
  }

  compileElement(element) {
    switch (element.type) {
      case 'TextElement':
        return JSON.stringify(element.value)
      case 'Placeable':
        return this.compilePlaceable(element)
      default:
        throw new Error(`Unknown element type: ${element.type}`)
    }
  }

  compilePlaceable(placeable) {
    const expr = placeable.expression
    switch (expr.type) {
      case 'Placeable':
        return this.compilePlaceable(expr)
      default:
        return this.compileExpression(expr)
    }
  }

  compileExpression(expr) {
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
        const args = this.compileCallArguments(expr.arguments)
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
        return `${expr.id.name}${this.compileCallArguments(expr.arguments)}`
      case 'SelectExpression': {
        const selector = this.compileExpression(expr.selector)
        const defaultVariant = expr.variants.find(variant => variant.default)
        const defaultKey = JSON.stringify(
          this.compileVariantKey(defaultVariant.key)
        )
        const variants = expr.variants.map(this.compileVariant, this).join(', ')
        return `$select(${selector}, ${defaultKey}, { ${variants} })`
      }
      case 'Placeable':
        return this.compilePlaceable(expr)
      default:
        throw new Error(`Unknown expression type: ${expr.type}`)
    }
  }

  compileVariant(variant) {
    const key = this.compileVariantKey(variant.key)
    let value
    if (variant.value.elements.length === 1) {
      value = ' ' + this.compileElement(variant.value.elements[0])
    } else {
      value = this.compilePattern(variant.value)
    }
    return `${key}:${indent(value)}`
  }

  compileCallArguments(expr) {
    let ctx = '$'
    if (expr && expr.named.length > 0) {
      const named = expr.named.map(this.compileNamedArgument, this)
      ctx = `{ ...$, ${named.join(', ')} }`
    }
    if (expr && expr.positional.length > 0) {
      const positional = expr.positional.map(this.compileExpression, this)
      return `(${ctx}, ${positional.join(', ')})`
    } else {
      return `(${ctx})`
    }
  }

  compileNamedArgument(arg) {
    const key = property(null, arg.name.name)
    const value = this.compileExpression(arg.value)
    return `${key}: ${value}`
  }

  compileVariantKey(key) {
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
