var fs = require('fs'),
  Path = require('path'),
  cache = {};

function reload(path, interval) {
  var stack = getStack(),
    cwd = getFilePath(stack),
    whole = getWhole(Path.join(cwd, path || '')),
    interval = interval || 5000;

  // todo check interval is num, or json

  var module = require(whole);
  setInterval(function() {
    debug('it\'s time to update!');
    // this just delete the old reference, not real delete
    delete require.cache[whole];
    var update = require(whole);
    // clone new module data to old reference
    clone(module, update);
    // so that old reference will have the same data with new
    // and new require will get the new module cache
  }, interval);

  return module;
}

var clone = function(dest, src) {
  if (!src)
    return;

  debug('dest:', dest);
  debug('src:', src);

  for (var f in src) {
    if (src.hasOwnProperty(f)) {
      dest[f] = src[f];
    }
  }

  for (f in dest) {
    if (!src.hasOwnProperty(f)) {
      delete dest[f];
    }
  }
};

var getWhole = function(path) {
  if (!!cache[path]) {
    return cache[path];
  }

  var org = path;
  if (fs.existsSync(path + '.js')) {
    path += '.js';
  } else if (fs.existsSync(path + '.json')) {
    path += '.json';
  }

  cache[org] = path;
  debug('path:', path);

  return path;
};

var getFilePath = function(stack) {
  return Path.dirname(stack[1].getFileName());
};

var getStack = function() {
  var orig = Error.prepareStackTrace;
  Error.prepareStackTrace = function(_, stack) {
    return stack;
  };
  var err = new Error();
  Error.captureStackTrace(err, arguments.callee);
  var stack = err.stack;
  Error.prepareStackTrace = orig;
  return stack;
};

var debug = function() {};
for (var i = process.argv.length - 1; i >= 0; i--) {
  if (process.argv[i] == '-d') {
    var debug = console.log;
  }
}

module.exports = reload;