var fs = require('fs'),
  Path = require('path'),
  cache = {};

function reload(path, interval) {
  var stack = getStack(),
    cwd = getFilePath(stack),
    whole = getWhole(Path.join(cwd, path || '')),
    interval = interval || 5000,
    now = Date.now();

  var module = require(whole);
  if (!module.__starttime__) {
    module.__starttime__ = now;
    module.__modifytime__ = now;
  } else if (now - module.__starttime__ > interval) {
    // todo check modify
    delete require.cache[whole];
    module = require(whole);
  }
  return module;
}

var getWhole = function(path) {
  if (!!cache[path]) {
    return cache[path];
  }

  if (fs.existsSync(path + '.js')) {
    path += '.js';
  } else if (fs.existsSync(path + '.json')) {
    path += '.json';
  }
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

module.exports = reload;