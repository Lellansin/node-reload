/*
 * Function exports can not be hot-swapped (a JS function keeps its code
 * forever), so route.js wraps the handler in an object. Refresh
 * http://127.0.0.1:3001/ every few seconds and watch the response change.
 */

var fs = require('fs');
var path = require('path');
var reload = require('../../');
var express = require('express');
var route = reload('./route');
var app = express();

app.get('/', function(req, res) {
  route.handler(req, res);
});

// update file every 3 secs
setInterval(function() {
  console.log('file updated!');
  var data =
    'module.exports = {\n' +
    '  handler: function(req, res) {\n' +
    '    res.send("hello ' + Math.random() + '");\n' +
    '  }\n' +
    '};\n';
  fs.writeFile(path.join(__dirname, 'route.js'), data, function(err) {
    if (err) console.error(err);
  });
}, 3000);

app.listen(3001);
console.log("Web server has started.\nPlease view on http://127.0.0.1:3001/");
