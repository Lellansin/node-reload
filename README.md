# node-reload

For node.js to reload the module ,which was to be load by `require`, automaticly.

## Install

```
npm install auto-reload
```

## Example

### Reload Json

`test/data/json.json`

```json
{ "name" : "Alan" }
```

`test/json.js`
```js
const fs = require('fs');
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
0 'Alan'
0 'Alan'
0.41179045320583496 'Test'
```

### Reload Js file

**Realod function haven't support**

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

// If you update the `time` in test/data/code.js
// the output will change immediately
```

## Aims

- [x] auto reload json file
- [x] auto reload js file
- [x] fix memory leak
- [ ] provide more options (include logger etc.)
- [ ] rewrite with promise (include improve exception catch)
- [ ] add tests with ava
