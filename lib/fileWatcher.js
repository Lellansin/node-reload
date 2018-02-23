const fs = require('fs');

const CACHE = {};
const WATCHED = {};
const FILE_CHANGED = 'updated';

exports.check = function watchFile(path, callback) {
  if (!WATCHED[path]) {
    WATCHED[path] = true;
    fs.watchFile(path, () => {
      CACHE[path] = FILE_CHANGED;
      callback(path);
    });
  }

  if (CACHE[path] == FILE_CHANGED) {
    CACHE[path] = null;
    return true;
  }
  return false;
};
