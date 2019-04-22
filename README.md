# fluent-compiler

`fluent-compiler` provides a JavaScript stringifier for [Fluent]. Essentially,
it's a transpiler that allows converting files from Fluent's `ftl` format to
JavaScript, outputting an ES6 module that exports a [FluentBundle], albeit
without the `addMessages` and `addResource` methods.

The difference between this package and the default `fluent` is that the latter
will need to compile your messages on the client, and is about 10kB when
compressed. The runtime component of `fluent-compiler` is less than 1kB, and it
lets you take care of the message compilation during your build.

[fluent]: https://projectfluent.org/
[fluentbundle]: http://projectfluent.org/fluent.js/fluent/class/src/bundle.js~FluentBundle.html

### Usage

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
import bundle from './messages.it'

bundle.format('sync-signedout-account-title')
// 'Connetti il tuo account Firefox'
```
