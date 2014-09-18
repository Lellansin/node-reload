var fs = require('fs'),
  Path = require('path'),
  cache = {};

function reload(path, interval) {
  var stack = getStack(),
    cwd = getFilePath(stack),
    whole = getWhole(Path.join(cwd, path || '')),
    interval = interval || 5000,
    now = Date.now();

  // todo check interval is num, or json

  var module = require(whole);
  setInterval(function() {
    debug('it\'s time to update!');
    delete require.cache[whole];
    var reload = require(whole);
    clone(module, reload);
    delete reload;
  }, interval);

  return module;
}

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
}

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

var clone = function(dest, src) {
  debug('dest:', dest);
  debug('src:', src);

  if (!src) {
    return;
  }

  for (var f in dest) {
    if (!src.hasOwnProperty(f)) {
      delete dest[f];
    }
  }

  for (var f in src) {
    if (src.hasOwnProperty(f)) {
      dest[f] = src[f];
    }
  }
};

if (process.argv) {
  var debug = function() {};
  for (var i = process.argv.length - 1; i >= 0; i--) {
    if (process.argv[i] == '-d') {
      var debug = console.log;
    }
  }
}

module.exports = reload;