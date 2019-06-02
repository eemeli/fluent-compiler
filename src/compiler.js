import { property } from 'safe-identifier'

export class FluentCompiler {
  constructor({
    runtimeGlobals = ['DATETIME', 'NUMBER'],
    runtimePath = 'fluent-compiler/runtime',
    useIsolating = true,
    withJunk = false
  } = {}) {
    this.runtimeGlobals = runtimeGlobals
    this.runtimePath = runtimePath
    this.useIsolating = useIsolating
    this.withJunk = withJunk
    this._rtImports = {}
  }

  compile(locales, resource) {
    if (resource.type !== 'Resource') {
      throw new Error(`Unknown resource type: ${resource.type}`)
    }

    this._rtImports = { bundle: true, isol: false, select: false }
    for (const fn of this.runtimeGlobals) this._rtImports[fn] = false

    const body = []
    for (const entry of resource.body) {
      if (entry.type !== 'Junk' || this.withJunk) body.push(this.entry(entry))
    }

    const rt = Object.keys(this._rtImports).filter(key => this._rtImports[key])
    const lc = JSON.stringify(locales || undefined)
    const head = [
      `import Runtime from "${this.runtimePath}"`,
      `const { ${rt.join(', ')} } = Runtime(${lc})`,
      'const R = new Map(['
    ].join('\n')

    const foot = [
      '])',
      'export const resource = R',
      'export default bundle(R)'
    ].join('\n')

    return `${head}\n\n${body.join('\n').trim()}\n\n${foot}\n`
  }

  entry(entry) {
    let comment
    switch (entry.type) {
      case 'Message':
        return this.message(entry)
      case 'Term':
        return this.term(entry)
      case 'Comment':
        comment = this.comment(entry, '//')
        break
      case 'GroupComment':
        comment = this.comment(entry, '// ##')
        break
      case 'ResourceComment':
        comment = this.comment(entry, '// ###')
        break
      case 'Junk':
        return this.junk(entry)
      default:
        throw new Error(`Unknown entry type: ${entry.type}`)
    }
    return `\n${comment}\n`
  }

  comment(comment, prefix = '//') {
    return comment.content
      .split('\n')
      .map(line => (line.length ? `${prefix} ${line}` : prefix))
      .join('\n')
  }

  junk(junk) {
    return junk.content.replace(/^/gm, '// ')
  }

  message(message) {
    const parts = []
    if (message.comment) parts.push(this.comment(message.comment))

    const name = JSON.stringify(message.id.name)
    const value = message.value ? this.pattern(message.value, false) : ' null'
    parts.push(this.messageBody(name, value, message.attributes))
    return parts.join('\n')
  }

  term(term) {
    const parts = []
    if (term.comment) parts.push(this.comment(term.comment))

    const name = JSON.stringify(`-${term.id.name}`)
    const value = this.pattern(term.value, false)
    parts.push(this.messageBody(name, value, term.attributes))
    return parts.join('\n')
  }

  messageBody(name, value, attributes) {
    const attrParts = []
    for (const attribute of attributes) {
      const name = JSON.stringify(attribute.id.name)
      const value = this.pattern(attribute.value, false)
      attrParts.push(`${name}: $ =>${value}`)
    }
    const parts = []
    switch (attrParts.length) {
      case 0:
        parts.push(`[${name}, { value: $ =>${value} }],`)
        break
      case 1:
        parts.push(`[${name}, {`)
        parts.push(`value: $ =>${value},`)
        parts.push(`attr: { ${attrParts[0]} }\n}],`)
        break
      default:
        parts.push(`[${name}, {`)
        parts.push(`value: $ =>${value},`)
        parts.push('attr: {')
        parts.push('  ' + attrParts.join(',\n    '))
        parts.push('}\n}],')
    }
    return parts.join('\n  ')
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
          this._rtImports.isol = true
          return `isol(${expr})`
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
        let out = `R.get(${JSON.stringify(`-${expr.id.name}`)})`
        if (expr.attribute) {
          out = property(`${out}.attr`, expr.attribute.name)
        } else {
          out = `${out}.value`
        }
        const args = this.termArguments(expr.arguments)
        return `${out}${args}`
      }
      case 'MessageReference': {
        let out = `R.get(${JSON.stringify(expr.id.name)})`
        if (expr.attribute) {
          out = property(`${out}.attr`, expr.attribute.name)
        } else {
          out = `${out}.value`
        }
        return `${out}($)`
      }
      case 'FunctionReference': {
        const fnName = expr.id.name
        if (!this.runtimeGlobals.includes(fnName))
          throw new Error(`Unsupported global ${fnName}`)
        this._rtImports[fnName] = true
        const args = this.functionArguments(expr.arguments)
        return `${fnName}${args}`
      }
      case 'SelectExpression': {
        const selector = this.expression(expr.selector)
        const defaultVariant = expr.variants.find(variant => variant.default)
        const defaultKey = JSON.stringify(this.variantKey(defaultVariant.key))
        const variants = expr.variants.map(this.variant, this).join(', ')
        this._rtImports.select = true
        return `select(${selector}, ${defaultKey}, { ${variants} })`
      }
      case 'Placeable':
        return this.expression(expr.expression)
      default:
        throw new Error(`Unknown expression type: ${expr.type}`)
    }
  }

  termArguments(expr) {
    if (!expr || expr.named.length === 0) return '()'
    const named = expr.named.map(this.namedArgument, this)
    return `({ ${named.join(', ')} })`
  }

  functionArguments(expr) {
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

  variant(variant) {
    const key = this.variantKey(variant.key)
    const value = this.pattern(variant.value, true)
    return `${key}:${value}`
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
