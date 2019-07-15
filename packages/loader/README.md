# fluent-loader

[Webpack] loader for [Fluent], using [fluent-compiler]. Allows FTL files to be loaded as Fluent [bundles] or [resources].

[webpack]: https://webpack.js.org/
[fluent]: https://projectfluent.org/
[fluent-compiler]: https://www.npmjs.com/package/fluent-compiler
[bundles]: http://projectfluent.org/fluent.js/fluent/class/src/bundle.js~FluentBundle.html
[resources]: http://projectfluent.org/fluent.js/fluent/class/src/resource.js~FluentResource.html

## Installation

```
npm install --save-dev fluent-loader
npm install --save-dev babel-loader @babel/core @babel/preset-env @babel/plugin-proposal-object-rest-spread
```

The output of `fluent-loader` is an ES6 module that may use `...spread` notation and other modern ES features, so it'll probably need to transpiled for your target environment; hence the second set of suggested dev dependencies above.

## Configuration

#### Simple

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.ftl$/,
        use: ['babel-loader', 'fluent-loader']
      }
    ]
  }
}
```

#### With Options

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.ftl$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
              plugins: ['@babel/plugin-proposal-object-rest-spread']
            }
          },
          {
            loader: 'fluent-loader',
            options: {
              locales: ['en-US'],
              useIsolating: true // Wrap placeables with Unicode FSI & PDI isolation marks
            }
          }
        ]
      }
    ]
  }
}
```

All `fluent-loader` options are optional, and the values shown above are the defaults. All other [fluent-compiler] options are also supported.

If `locales` contains more than one entry, the locale of an FTL file will be detected by looking for a matching substring in the file path. For example, if `locales` is `['en-US', 'fi-FI']`, files such as `messages_fi.ftl` and `i18n/fi-FI/messages.ftl` will be recognised as having a Finnish locale. These substrings must be separated from the rest of the path by `/`, `.` or `_` characters. On no match, the first entry of `locales` will be used as the default value.

## Usage

Presuming configuration with the options `{ locales: ['en', 'fi'], useIsolating: false }`:

### `messages.ftl`

```
hello-user = Hello, {$userName}!
shared-photos =
    {$userName} {$photoCount ->
        [one] added a new photo
       *[other] added {$photoCount} new photos
    } to {$userGender ->
        [male] his album
        [female] her album
       *[other] their album
    }.
```

### `messages.fi.ftl`

```
hello-user = Hei, {$userName}!
shared-photos =
    {$userName} lisäsi {$photoCount ->
        [one] uuden kuvan
       *[other] {$photoCount} uutta kuvaa
    } albumiinsa.
```

### `app.js`

```js
import en from './messages.ftl'
import fi from './messages.fi.ftl'

en.locales // ['en']
fi.locales // ['fi']

const userData = {
  photoCount: 1,
  userGender: 'female',
  userName: 'Eve'
}

en.format('hello-user', userData) // 'Hello, Eve!'
fi.format('hello-user', userData) // 'Hei, Eve!'

en.format('shared-photos', userData) // 'Eve added a new photo to her album.'
fi.format('shared-photos', userData) // 'Eve lisäsi uuden kuvan albumiinsa.'
```
