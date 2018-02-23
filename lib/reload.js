const fs = require('fs');
const vm = require('vm');
const Path = require('path');
const fw = require('./fileWatcher');

// TODO deprecate this.. and use async/await to replace this
function reload(path, interval) {
  const stack = getStack();
  const cwd = getFilePath(stack);
  const whole = getWhole(Path.join(cwd, path || ''));
  // TODO use options
  interval = Number(interval);

  // todo check interval is num, or json
  let module = require(whole);
  if (interval > 1000) {
    setInterval(flush, interval);
  } else {
    fw.check(whole, flush);
  }
  return module;

  function flush() {
    debug('it\'s time to update!');
    // todo check modify if optioned

    try {
      let update = load(whole);
      // renew new module data to old reference
      renew(module, update);
      // so that old reference will have the same data with new
      // and new require will get the new module cache
    } catch(err) {
      // TODO use Pomise.reject to return the error
      console.error('flush error', err);
    }
  }
};

// TODO rewrite with promise
function load(path) {
  const ext = Path.extname(path);
  if (ext == '.json') {
    return loadJson(path);
  }
  if (ext == '.js') {
    return loadCode(path);
  }
  // TODO Pomise.reject
  throw new Error('Bad file extname ' + ext);
}

function loadJson(path) {
  try {
    const data = fs.readFileSync(path).toString();
    return JSON.parse(data);
  } catch(err) {
    throw new Error(err);
  }
}

function loadCode(path) {
  try {
    const code = fs.readFileSync(path).toString();
    const module = {
      exports: {}
    };
    const ctx = vm.createContext(Object.assign({
      module,
      exports: module.exports,
      __filename: path,
      __dirname: Path.dirname(path),
      require
    }, global));
    vm.runInContext(`
      (function (exports, require, module, __filename, __dirname) {
        ${code}
      })(exports, require, module, __filename, __dirname)`, ctx);
    return module.exports;
  } catch(err) {
    throw new Error(err);
  }
}

function renew(dest, src) {
  if (!src) return;
  if (!dest) return;

  debug('dest:', dest);
  debug('src:', src);

  if (typeof src == 'function') {
    return;
  }

  for (var f in src) {
    // ingore property
    if (!src.hasOwnProperty(f)) continue;
    const typeSrc = typeof src[f];
    const typeDest = typeof dest[f];
    // ingore function property
    if (typeSrc == 'function') continue;
    // if there is object/array to renew
    if (typeDest == 'undefined') {
      dest[f] = src[f];
    } else if (typeSrc == 'object' || typeDest != 'object') {
      dest[f] = src[f];
    } else if (typeSrc == 'object' && typeDest == 'object') {
      renew(dest[f], src[f]);
    } else {
      // renew normal values
      dest[f] = src[f];
    }
  }

  // If old reference is still in use
  // this will ensure you can't get the old value from new reference
  for (f in dest) {
    if (!src.hasOwnProperty(f)) {
      delete dest[f];
    }
  }
}

const cache = {};
function getWhole(path) {
  if (!!cache[path]) {
    return cache[path];
  }

  const org = path;
  if (fs.existsSync(path + '.js')) {
    path += '.js';
  } else if (fs.existsSync(path + '.json')) {
    path += '.json';
  }

  cache[org] = path;
  debug('path:', path);

  return path;
}

function getFilePath(stack) {
  return Path.dirname(stack[1].getFileName());
}

function getStack() {
  const orig = Error.prepareStackTrace;
  Error.prepareStackTrace = function(_, stack) {
    return stack;
  };
  const err = new Error();
  Error.captureStackTrace(err, arguments.callee);
  const stack = err.stack;
  Error.prepareStackTrace = orig;
  return stack;
}

var debug = function() {};
for (var i = process.argv.length - 1; i >= 0; i--) {
  if (process.argv[i] == '-d') {
    var debug = console.log;
  }
}

module.exports = reload;