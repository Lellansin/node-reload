# node-reload

[![CI](https://github.com/Lellansin/node-reload/actions/workflows/ci.yml/badge.svg)](https://github.com/Lellansin/node-reload/actions/workflows/ci.yml)
[![coverage](https://raw.githubusercontent.com/Lellansin/node-reload/badges/coverage-badge.svg)](https://github.com/Lellansin/node-reload/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/auto-reload.svg)](https://www.npmjs.com/package/auto-reload)
![node](https://img.shields.io/badge/node-%3E%3D4-blue.svg)
[![license](https://img.shields.io/github/license/Lellansin/node-reload.svg)](./LICENSE)

For node.js to reload the module, which was loaded by `require`, automatically when its file changes.

Works on every Node.js version from v4 up to the latest (regression-tested in CI).

## Install

```
npm install auto-reload
```

## Example

### Reload Json

`test/data/json.json`

```json
{
  "rand": 0,
  "list": [{
    "name": "Alan"
  }]
}
```

`test/json.js`
```js
const fs = require('fs');
const path = require('path');
const reload = require('auto-reload');
const data = reload('./data/json'); // reload after file changed

// print data every sec
setInterval(() => {
  console.log(data.rand, data.list[0].name);
}, 1000);

// update data.json after startup
setTimeout(() => {
  const text = `{
  "rand": ${Math.random()},
  "list": [{
    "name": "Test"
  }]
}`;
  fs.writeFileSync(path.join(__dirname, './data/json.json'), text);
}, 0);
```

Result:

```js
0 'Alan'
0 'Alan'
0.41179045320583496 'Test'
```

### Reload Js file

`test/data/code.js`
```js
module.exports = {
  num: 0,
  str: 'string',
  obj: {
    name: 'Alan',
    age: 18
  },
  list: [1,3,5,7,9]
};
```

`test/code.js`
```js
const reload = require('../');
const data = reload('./data/code');

// print data from module every sec
setInterval(function() {
  console.log(new Date, data);
}, 1000);

// If you update test/data/code.js
// the output will change immediately
```

## How it works

`reload(path[, interval])` returns the module exports and keeps updating **that
same object in place** whenever the file changes, so every reference you handed
out (including nested ones) stays current:

| usage | behavior |
| --- | --- |
| `reload(path)` | watch the file (stat polling, ~500ms), update on change |
| `reload(path, n)` with `n <= 1000` | same as above |
| `reload(path, n)` with `n > 1000` | check the file every `n` ms, update only when it changed |

Notes:

- Relative paths resolve against the directory of the file that calls `reload()`.
- Fresh `require()` calls of the same file always return the new data too.
- When an update fails (e.g. the file was saved half-written / has a syntax
  error), the old data is kept and the error is logged once instead of spamming
  on every retry; logging resumes when a different error occurs.
- Debug output can be enabled with the `-d` CLI flag or `NODE_DEBUG=auto-reload`.

## Limitations

- **Function exports can not be hot-swapped.** JavaScript function objects
  keep their code forever, so `module.exports = function ...` stays on the old
  implementation (a warning is logged once). Wrap it in an object instead:

  ```js
  // route.js
  module.exports = { handler: function (req, res) { res.send('hello'); } };

  // app.js
  const route = reload('./route');
  app.get('/', (req, res) => route.handler(req, res));
  ```

  The same applies to function *properties* inside an exported object.
- Primitive exports (`module.exports = 42`) can not update old references;
  the old value is kept and a warning is logged once.
- Editing a file without changing its size *and* its mtime granularity
  (within the same second on filesystems with 1s mtime resolution) is
  detected on the next change.

## Aims

- [x] auto reload json file
- [x] auto reload js file
- [x] fix memory leak (no more vm context per reload)
- [x] deep-renew nested references (and survive circular references)
- [x] relative `require()` inside reloaded modules resolves correctly
- [x] unit test suite without dependencies (runs on Node >= 4)
- [x] CI matrix from Node v4 to the current release
- [ ] provide more options (include logger etc.)
- [ ] rewrite with promise (include improve exception catch)

## Development

Run the test suite (no dependencies to install):

```
npm test
```

Run the tests with coverage — c8 enforces 100% coverage (statements,
branches, functions, lines) over `lib/` + `index.js`. CI runs this on every
push and publishes the badge to the `badges` branch:

```
npm run coverage
```

The files under `test/` (other than `test/run.js`, `test/helpers.js` and
`*.test.js`) are manual
demos — start one, edit the watched file, and watch it update. The express demo
needs `npm i express` first.
