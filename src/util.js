// From https://github.com/messageformat/messageformat/blob/a383697/packages/messageformat/src/utils.js
// Copyright 2012-2019 OpenJS Foundation and Contributors
// License: MIT <https://opensource.org/licenses/MIT>

const reservedES3 = {
  break: true,
  continue: true,
  delete: true,
  else: true,
  for: true,
  function: true,
  if: true,
  in: true,
  new: true,
  return: true,
  this: true,
  typeof: true,
  var: true,
  void: true,
  while: true,
  with: true,
  case: true,
  catch: true,
  default: true,
  do: true,
  finally: true,
  instanceof: true,
  switch: true,
  throw: true,
  try: true
}

const reservedES5 = {
  // in addition to reservedES3
  debugger: true,
  class: true,
  enum: true,
  extends: true,
  super: true,
  const: true,
  export: true,
  import: true,
  null: true,
  true: true,
  false: true,
  implements: true,
  let: true,
  private: true,
  public: true,
  yield: true,
  interface: true,
  package: true,
  protected: true,
  static: true
}

/**
 * Utility function for quoting an Object's key value if required
 *
 * Quotes the key if it contains invalid characters or is an
 * ECMAScript 3rd Edition reserved word (for IE8).
 */
export function propname(obj, key) {
  if (/^[A-Z_$][0-9A-Z_$]*$/i.test(key) && !reservedES3[key]) {
    return obj ? `${obj}.${key}` : key
  } else {
    const jkey = JSON.stringify(key)
    return obj ? obj + `[${jkey}]` : jkey
  }
}

/**
 * Utility function for escaping a function name if required
 */
export function funcname(key) {
  const fn = key.trim().replace(/\W+/g, '_')
  return reservedES3[fn] || reservedES5[fn] || /^\d/.test(fn) ? '_' + fn : fn
}
