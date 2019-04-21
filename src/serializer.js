import { funcname, propname } from './util'

function indent(content) {
  return content.split('\n').join('\n    ')
}

export // Bit masks representing the state of the serializer.
const HAS_ENTRIES = 1

export class FluentSerializer {
  constructor({ withJunk = false } = {}) {
    this.withJunk = withJunk
  }

  serialize(resource) {
    if (resource.type !== 'Resource') {
      throw new Error(`Unknown resource type: ${resource.type}`)
    }

    let state = 0
    const parts = []

    for (const entry of resource.body) {
      if (entry.type !== 'Junk' || this.withJunk) {
        parts.push(this.serializeEntry(entry, state))
        if (!(state & HAS_ENTRIES)) {
          state |= HAS_ENTRIES
        }
      }
    }

    return parts.join('')
  }

  serializeEntry(entry, state = 0) {
    switch (entry.type) {
      case 'Message':
        return serializeMessage(entry)
      case 'Term':
        return serializeTerm(entry)
      case 'Comment':
        if (state & HAS_ENTRIES) {
          return `\n${serializeComment(entry, '//')}\n`
        }
        return `${serializeComment(entry, '//')}\n`
      case 'GroupComment':
        if (state & HAS_ENTRIES) {
          return `\n${serializeComment(entry, '// ##')}\n`
        }
        return `${serializeComment(entry, '// ##')}\n`
      case 'ResourceComment':
        if (state & HAS_ENTRIES) {
          return `\n${serializeComment(entry, '// ###')}\n`
        }
        return `${serializeComment(entry, '// ###')}\n`
      case 'Junk':
        return serializeJunk(entry)
      default:
        throw new Error(`Unknown entry type: ${entry.type}`)
    }
  }
}

function serializeComment(comment, prefix = '//') {
  const prefixed = comment.content
    .split('\n')
    .map(line => (line.length ? `${prefix} ${line}` : prefix))
    .join('\n')
  // Add the trailing newline.
  return `${prefixed}\n`
}

function serializeJunk(junk) {
  return junk.content.replace(/^/gm, '// ')
}

function serializeMessage(message) {
  const parts = []

  if (message.comment) {
    parts.push(serializeComment(message.comment))
  }

  const name = funcname(message.id.name)
  parts.push(`export const ${name} = $ =>`)

  if (message.value) {
    parts.push(serializePattern(message.value))
  } else {
    parts.push(' null')
  }

  for (const attribute of message.attributes) {
    parts.push(serializeAttribute(name, attribute))
  }

  parts.push('\n')
  return parts.join('')
}

function serializeTerm(term) {
  const parts = []

  if (term.comment) {
    parts.push(serializeComment(term.comment))
  }

  const name = funcname(`-${term.id.name}`)
  parts.push(`const ${name} = $ =>`)
  parts.push(serializePattern(term.value))

  for (const attribute of term.attributes) {
    parts.push(serializeAttribute(name, attribute))
  }

  parts.push('\n')
  return parts.join('')
}

function serializeAttribute(parentName, attribute) {
  const name = propname(parentName, attribute.id.name)
  const value = indent(serializePattern(attribute.value))
  return `\n${name} = $ =>${value}`
}

function serializePattern(pattern) {
  const content = pattern.elements.map(serializeElement)
  const contentLength = content.reduce(
    (len, c) => len + c.length,
    (content.length - 1) * 3
  )
  const startOnNewLine = contentLength > 60
  if (startOnNewLine) {
    return `\n    ${indent(content.join(' +\n'))}`
  }
  return ` ${content.join(' + ')}`
}

function serializeElement(element) {
  switch (element.type) {
    case 'TextElement':
      return JSON.stringify(element.value)
    case 'Placeable':
      return serializePlaceable(element)
    default:
      throw new Error(`Unknown element type: ${element.type}`)
  }
}

function serializePlaceable(placeable) {
  const expr = placeable.expression
  switch (expr.type) {
    case 'Placeable':
      return serializePlaceable(expr)
    default:
      return serializeExpression(expr)
  }
}

export function serializeExpression(expr) {
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
      const args = serializeCallArguments(expr.arguments)
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
      return `${expr.id.name}${serializeCallArguments(expr.arguments)}`
    case 'SelectExpression': {
      const selector = serializeExpression(expr.selector)
      const defaultVariant = expr.variants.find(variant => variant.default)
      const defaultKey = JSON.stringify(serializeVariantKey(defaultVariant.key))
      const variants = expr.variants.map(serializeVariant).join(', ')
      return `$select(${selector}, ${defaultKey}, { ${variants} })`
    }
    case 'Placeable':
      return serializePlaceable(expr)
    default:
      throw new Error(`Unknown expression type: ${expr.type}`)
  }
}

function serializeVariant(variant) {
  const key = serializeVariantKey(variant.key)
  const value = indent(serializePattern(variant.value))
  return `${key}:${value}`
}

function serializeCallArguments(expr) {
  let ctx = '$'
  if (expr && expr.named.length > 0) {
    const named = expr.named.map(serializeNamedArgument)
    ctx = `{ ...$, ${named.join(', ')} }`
  }
  if (expr && expr.positional.length > 0) {
    const positional = expr.positional.map(serializeExpression)
    return `(${ctx}, ${positional.join(', ')})`
  } else {
    return `(${ctx})`
  }
}

function serializeNamedArgument(arg) {
  const key = propname(null, arg.name.name)
  const value = serializeExpression(arg.value)
  return `${key}: ${value}`
}

export function serializeVariantKey(key) {
  switch (key.type) {
    case 'Identifier':
      return key.name
    case 'NumberLiteral':
      return key.value
    default:
      throw new Error(`Unknown variant key type: ${key.type}`)
  }
}
