import { funcname, propname } from './util'

function indent(content) {
  return content.split('\n').join('\n    ')
}

export // Bit masks representing the state of the compiler.
const HAS_ENTRIES = 1

export class FluentJSCompiler {
  constructor({ withJunk = false } = {}) {
    this.withJunk = withJunk
    this._exports = []
  }

  compile(locales, resource) {
    this._exports = []

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

  compileEntry(entry, state = 0) {
    switch (entry.type) {
      case 'Message': {
        const varName = funcname(entry.id.name)
        this._exports.push(compileExport(entry.id.name, varName))
        return compileMessage(entry, varName)
      }
      case 'Term':
        return compileTerm(entry)
      case 'Comment':
        if (state & HAS_ENTRIES) {
          return `\n${compileComment(entry, '//')}\n`
        }
        return `${compileComment(entry, '//')}\n`
      case 'GroupComment':
        if (state & HAS_ENTRIES) {
          return `\n${compileComment(entry, '// ##')}\n`
        }
        return `${compileComment(entry, '// ##')}\n`
      case 'ResourceComment':
        if (state & HAS_ENTRIES) {
          return `\n${compileComment(entry, '// ###')}\n`
        }
        return `${compileComment(entry, '// ###')}\n`
      case 'Junk':
        return compileJunk(entry)
      default:
        throw new Error(`Unknown entry type: ${entry.type}`)
    }
  }
}

function compileExport(id, varName) {
  if (id === varName) {
    return id
  } else {
    return `${propname(null, id)}: ${varName}`
  }
}

function compileComment(comment, prefix = '//') {
  const prefixed = comment.content
    .split('\n')
    .map(line => (line.length ? `${prefix} ${line}` : prefix))
    .join('\n')
  // Add the trailing newline.
  return `${prefixed}\n`
}

function compileJunk(junk) {
  return junk.content.replace(/^/gm, '// ')
}

function compileMessage(message, varName) {
  const parts = []

  if (message.comment) {
    parts.push(compileComment(message.comment))
  }

  parts.push(`const ${varName} = $ =>`)

  if (message.value) {
    parts.push(compilePattern(message.value))
  } else {
    parts.push(' null')
  }

  for (const attribute of message.attributes) {
    parts.push(compileAttribute(varName, attribute))
  }

  parts.push('\n')
  return parts.join('')
}

function compileTerm(term) {
  const parts = []

  if (term.comment) {
    parts.push(compileComment(term.comment))
  }

  const name = funcname(`-${term.id.name}`)
  parts.push(`const ${name} = $ =>`)
  parts.push(compilePattern(term.value))

  for (const attribute of term.attributes) {
    parts.push(compileAttribute(name, attribute))
  }

  parts.push('\n')
  return parts.join('')
}

function compileAttribute(parentName, attribute) {
  const name = propname(parentName, attribute.id.name)
  const value = indent(compilePattern(attribute.value))
  return `\n${name} = $ =>${value}`
}

function compilePattern(pattern) {
  const content = pattern.elements.map(compileElement)
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

function compileElement(element) {
  switch (element.type) {
    case 'TextElement':
      return JSON.stringify(element.value)
    case 'Placeable':
      return compilePlaceable(element)
    default:
      throw new Error(`Unknown element type: ${element.type}`)
  }
}

function compilePlaceable(placeable) {
  const expr = placeable.expression
  switch (expr.type) {
    case 'Placeable':
      return compilePlaceable(expr)
    default:
      return compileExpression(expr)
  }
}

export function compileExpression(expr) {
  switch (expr.type) {
    case 'StringLiteral':
      return `"${expr.value}"`
    case 'NumberLiteral':
      return expr.value
    case 'VariableReference':
      return propname('$', expr.id.name)
    case 'TermReference': {
      let out = funcname(`-${expr.id.name}`)
      if (expr.attribute) {
        out = propname(out, expr.attribute.name)
      }
      const args = compileCallArguments(expr.arguments)
      return `${out}${args}`
    }
    case 'MessageReference': {
      let out = funcname(expr.id.name)
      if (expr.attribute) {
        out = propname(out, expr.attribute.name)
      }
      return `${out}($)`
    }
    case 'FunctionReference':
      return `${expr.id.name}${compileCallArguments(expr.arguments)}`
    case 'SelectExpression': {
      const selector = compileExpression(expr.selector)
      const defaultVariant = expr.variants.find(variant => variant.default)
      const defaultKey = JSON.stringify(compileVariantKey(defaultVariant.key))
      const variants = expr.variants.map(compileVariant).join(', ')
      return `$select(${selector}, ${defaultKey}, { ${variants} })`
    }
    case 'Placeable':
      return compilePlaceable(expr)
    default:
      throw new Error(`Unknown expression type: ${expr.type}`)
  }
}

function compileVariant(variant) {
  const key = compileVariantKey(variant.key)
  let value
  if (variant.value.elements.length === 1) {
    value = ' ' + compileElement(variant.value.elements[0])
  } else {
    value = compilePattern(variant.value)
  }
  return `${key}:${indent(value)}`
}

function compileCallArguments(expr) {
  let ctx = '$'
  if (expr && expr.named.length > 0) {
    const named = expr.named.map(compileNamedArgument)
    ctx = `{ ...$, ${named.join(', ')} }`
  }
  if (expr && expr.positional.length > 0) {
    const positional = expr.positional.map(compileExpression)
    return `(${ctx}, ${positional.join(', ')})`
  } else {
    return `(${ctx})`
  }
}

function compileNamedArgument(arg) {
  const key = propname(null, arg.name.name)
  const value = compileExpression(arg.value)
  return `${key}: ${value}`
}

export function compileVariantKey(key) {
  switch (key.type) {
    case 'Identifier':
      return key.name
    case 'NumberLiteral':
      return key.value
    default:
      throw new Error(`Unknown variant key type: ${key.type}`)
  }
}
