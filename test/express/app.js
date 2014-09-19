/*
 * It's not work now
 */

var fs = require('fs');
var reload = require('../../');
var express = require('express');
var route = reload('./route');
var app = express();

app.get('/', route);

// update file every 3 secs
setInterval(function() {
  console.log('file updated!');
  var data =
    'module.exports = function(req, res) {' +
    'res.send("hello ' + Math.random() + '");' +
    '}';
  fs.writeFile('./route.js', data);
}, 3000);

app.listen(3001);
console.log("Web server has started.\nPlease view on http://127.0.0.1:3001/");