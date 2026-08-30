// Generates a shields-style SVG badge from c8's coverage-summary.json.
// Runs in CI after `npm run coverage`; the badge is published to the
// `badges` branch and embedded in README.md.
var fs = require('fs');

var summary = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
var pct = summary.total.lines.pct;
var value = pct + '%';
var color = pct >= 100 ? '#4c1' : pct >= 90 ? '#97ca00' : pct >= 75 ? '#dfb317' : '#e05d44';

var label = 'coverage';
var labelWidth = 7 * label.length + 20;
var valueWidth = 7 * value.length + 20;
var width = labelWidth + valueWidth;

var svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="20" role="img" aria-label="' + label + ': ' + value + '">' +
  '<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>' +
  '<clipPath id="r"><rect width="' + width + '" height="20" rx="3" fill="#fff"/></clipPath>' +
  '<g clip-path="url(#r)">' +
  '<rect width="' + labelWidth + '" height="20" fill="#555"/>' +
  '<rect x="' + labelWidth + '" width="' + valueWidth + '" height="20" fill="' + color + '"/>' +
  '<rect width="' + width + '" height="20" fill="url(#s)"/>' +
  '</g>' +
  '<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">' +
  '<text x="' + Math.round(labelWidth / 2) + '" y="14">' + label + '</text>' +
  '<text x="' + (labelWidth + Math.round(valueWidth / 2)) + '" y="14">' + value + '</text>' +
  '</g></svg>';

fs.writeFileSync('coverage-badge.svg', svg + '\n');
console.log('coverage badge written: ' + value);
