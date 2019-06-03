import { property } from 'safe-identifier'

export class FluentCompiler {
  constructor({
    runtime = 'bundle',
    runtimeGlobals = ['DATETIME', 'NUMBER'],
    runtimePath = 'fluent-compiler/runtime',
    useIsolating = true,
    withJunk = false
  } = {}) {
    this.runtime = runtime
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

    this._rtImports = {
      bundle: this.runtime !== 'resource',
      isol: false,
      select: false
    }
    for (const fn of this.runtimeGlobals) this._rtImports[fn] = false

    const body = []
    for (const entry of resource.body) {
      if (entry.type !== 'Junk' || this.withJunk) body.push(this.entry(entry))
    }

    const rt = Object.keys(this._rtImports).filter(key => this._rtImports[key])
    const lc = JSON.stringify(locales || undefined)
    const head = [
      `import Runtime from "${this.runtimePath}";`,
      `const { ${rt.join(', ')} } = Runtime(${lc});`,
      'const R = new Map(['
    ].join('\n')

    const foot = [']);']
    switch (this.runtime) {
      case 'bundle':
        foot.push('export default bundle(R);')
        break
      case 'resource':
        foot.push('export default R;')
        break
      default:
        throw new Error(`Unknown runtime ${JSON.stringify(this.runtime)}`)
    }
    return `${head}\n\n${body.join('\n').trim()}\n\n${foot.join('\n')}\n`
  }

  entry(entry) {
    switch (entry.type) {
      case 'Message':
        return this.message(entry)
      case 'Term':
        return this.term(entry)
      case 'Comment':
        return this.comment(entry, '//')
      case 'GroupComment':
        return this.comment(entry, '// ##')
      case 'ResourceComment':
        return this.comment(entry, '// ###')
      case 'Junk':
        return this.junk(entry)
      default:
        throw new Error(`Unknown entry type: ${entry.type}`)
    }
  }

  comment(comment, prefix = '//') {
    const cc = comment.content
      .split('\n')
      .map(line => (line.length ? `${prefix} ${line}` : prefix))
      .join('\n')
    return `\n${cc}\n`
  }

  junk(junk) {
    return junk.content.replace(/^/gm, '// ')
  }

  message(message) {
    const head = message.comment ? this.comment(message.comment) : ''
    const name = JSON.stringify(message.id.name)
    const value = message.value ? this.pattern(message.value, false) : ' null'
    const body = this.messageBody(name, value, message.attributes)
    return head + body
  }

  term(term) {
    const head = term.comment ? this.comment(term.comment) : ''
    const name = JSON.stringify(`-${term.id.name}`)
    const value = this.pattern(term.value, false)
    const body = this.messageBody(name, value, term.attributes)
    return head + body
  }

  messageBody(name, value, attributes) {
    const attr = []
    for (const attribute of attributes) {
      const name = JSON.stringify(attribute.id.name)
      const value = this.pattern(attribute.value, false)
      attr.push(`${name}: $ =>${value}`)
    }
    switch (attr.length) {
      case 0:
        return `[${name}, { value: $ =>${value} }],`
      case 1:
        return [
          `[${name}, {`,
          `  value: $ =>${value},`,
          `  attr: { ${attr[0]} }`,
          '}],'
        ].join('\n')
      default:
        return [
          `[${name}, {`,
          `  value: $ =>${value},`,
          '  attr: {',
          `    ${attr.join(',\n    ')}`,
          '  }',
          '}],'
        ].join('\n')
    }
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
