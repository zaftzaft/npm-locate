'use strict';

const byteFormat = (bytes) => {
  let kib = 1 << 10;
  let mib = 1 << 20;
  let gib = 1 << 30;

  return bytes > gib ? `${(bytes / gib).toFixed(1)}G` :
    bytes > mib ? `${(bytes / mib).toFixed(1)}M` :
    bytes > kib ? `${(bytes / kib).toFixed(1)}K` :
    `${bytes}B`;
};


const pad = (s, n) => {
  if(s.length < n){
    s += new Array(n - s.length + 1).join(" ");
  }
  return s;
};


module.exports = (bytes, contentLength) => {
  let percent = bytes / contentLength;

  let bytef = pad(byteFormat(bytes) + "/" + byteFormat(contentLength), 15);

  let ps = "" + (percent * 100 | 0) + "%";
  ps = new Array(5 - ps.length).join(" ") + ps;

  let left = bytef + " [";
  let right = "] " + ps + " ";

  let size = process.stdout.columns - left.length - right.length;
  let bar = new Array((size * percent|0) + 1).join("=");
  bar = pad(bar, size);

  return `${left}${bar}${right}`;
};
