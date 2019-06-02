import { FluentParser } from 'fluent-syntax'
import { FluentJSCompiler } from './compiler'

export { compile, FluentJSCompiler }

/**
 * Compile a Fluent resource into the source of an ES6 module
 *
 * The output module default-exports an object providing the same interface as
 * [FluentBundle](http://projectfluent.org/fluent.js/fluent/class/src/bundle.js~FluentBundle.html)
 * except for its `addMessages` and `addResource` methods.
 *
 * @param {string | string[] | undefined} locales The resource's locale identifier
 * @param {string | Resource} source Fluent source as a string, or an AST compiled from it
 * @param {Object} [opts={}] Options passed to both FluentParser and FluentJSCompiler
 * @param {string[]} [opts.runtimeGlobals=['DATETIME', 'NUMBER']] Identifiers of global functions available in the runtime
 * @param {boolean} [opts.runtimePath='fluent-compiler/runtime'] Path for the runtime dependency
 * @param {boolean} [opts.useIsolating=true] Wrap placeables with Unicode FSI & PDI isolation marks
 * @param {boolean} [opts.withJunk=false] Include unparsed source as comments in the output
 * @returns {string} The source of an ES6 module exporting a FluentBundle implementation of the source
 */
function compile(locales, source, opts) {
  if (typeof source === 'string') {
    const parser = new FluentParser()
    source = parser.parse(source)
  }
  const compiler = new FluentJSCompiler(opts)
  return compiler.compile(locales, source)
}
