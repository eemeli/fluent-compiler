# fluent-compiler

`fluent-compiler` provides a JavaScript stringifier for [Fluent]. Essentially,
it's a transpiler that allows converting files from Fluent's `ftl` format to
JavaScript, outputting an ES6 module that exports a [FluentBundle].

The difference between this package and the core `fluent` package is that the
latter will need to compile your messages on the client, and is about 10kB when
compressed. The runtime component of `fluent-compiler` is less than 1kB, and it
lets you take care of the message compilation during your build.

[fluent]: https://projectfluent.org/
[fluentbundle]: http://projectfluent.org/fluent.js/fluent/class/src/bundle.js~FluentBundle.html

## API

```js
import { compile } from 'fluent-compiler'
```

### `compile(locales, source, options = {}) => FluentBundle`

| Param   | Type                            | Description                                                                        |
| ------- | ------------------------------- | ---------------------------------------------------------------------------------- |
| locales | `string | string[] | undefined` | The resource's locale identifier                                                   |
| source  | `string | Resource`             | Fluent source as a string, or an AST compiled with the [`fluent-syntax`][1] parser |
| options | `Object`                        | Compiler options (optional)                                                        |

The [`FluentBundle`][fluentbundle] returned by `compile()` provides the same API
as that of the `fluent` package, with the exception of the Fluent-compiling
`addMessages` method.

#### Options

| Option       | Type      | Default                     | Description                                            |
| ------------ | --------- | --------------------------- | ------------------------------------------------------ |
| runtimePath  | `string`  | `'fluent-compiler/runtime'` | Path for the runtime dependency                        |
| useIsolating | `boolean` | `true`                      | Wrap placeables with Unicode FSI & PDI isolation marks |
| withJunk     | `boolean` | `false`                     | Include unparsed source as comments in the output      |

[1]: https://www.npmjs.com/package/fluent-syntax

## Usage

Fluent source file `messages.it.ftl`:

```ftl
-sync-brand-name = {$capitalization ->
   *[uppercase] Account Firefox
    [lowercase] account Firefox
}

sync-dialog-title = {-sync-brand-name}
sync-headline-title =
    {-sync-brand-name}: il modo migliore
    per avere i tuoi dati sempre con te

# Explicitly request the lowercase variant of the brand name.
sync-signedout-account-title =
    Connetti il tuo {-sync-brand-name(capitalization: "lowercase")}
```

Build script:

```js
import { compile } from 'fluent-compiler'
import fs from 'fs'

const src = fs.readFileSync('messages.it.ftl')
const js = compile('it', src)
fs.writeFileSync('messages.it.js', js)
```

Application code:

```js
import it from './messages.it'

it.format('sync-signedout-account-title')
// 'Connetti il tuo account Firefox'
```

## Polyfills

The ES6 module output by `compile()` will probably need to itself be transpiled,
as it uses Object Spread syntax (currently at Stage 3). Furthermore, the runtime
may need polyfills for the Intl objects and Object.entries (used by the bundle's
`messages` getter). In particular, [intl-pluralrules] patches some of the
deficiencies in current browsers.

[intl-pluralrules]: https://www.npmjs.com/package/intl-pluralrules
