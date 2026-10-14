// Startup file for cPanel / DirectAdmin / CloudLinux "Setup Node.js App"
// (copied into the package by npm run build:standalone).
//
// - Dependencies are in .next/node_modules, because CloudLinux reserves ./node_modules for its
//   own virtual environment; NODE_PATH points server.js (CommonJS) at them.
// - Writes startup.log next to this file: Node version, the start/listen sequence, and every
//   error the app prints. Shared hosts often show no Node logs at all, so this is the place to
//   look when the site says "Web application could not be started".
// - If the app can't start, it still answers with a short 503 (details only in startup.log),
//   so the host doesn't restart it in a loop.
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const Module = require('module');

const LOG = path.join(__dirname, 'startup.log');
const MAX_LOG_BYTES = 5 * 1024 * 1024;

function log(message) {
  try {
    if (fs.existsSync(LOG) && fs.statSync(LOG).size > MAX_LOG_BYTES) fs.renameSync(LOG, LOG + '.old');
    fs.appendFileSync(LOG, '[' + new Date().toISOString() + '] ' + message + '\n');
  } catch (_) {
    // Logging must never take the site down.
  }
}

// Copy everything written to stderr (console.error, Next.js errors) into startup.log too.
const writeStderr = process.stderr.write.bind(process.stderr);
process.stderr.write = function (chunk, ...rest) {
  log('stderr: ' + String(chunk).replace(/\s+$/, ''));
  return writeStderr(chunk, ...rest);
};

process.on('uncaughtException', err => log('uncaughtException: ' + (err && err.stack ? err.stack : err)));
process.on('unhandledRejection', err => log('unhandledRejection: ' + (err && err.stack ? err.stack : err)));
process.on('exit', code => log('process exit, code ' + code));

const mem = process.memoryUsage();
log(
  'starting: node ' + process.version + ' (' + process.platform + '/' + process.arch + ')' +
    ', pid ' + process.pid +
    ', NODE_ENV=' + (process.env.NODE_ENV || '-') +
    ', PORT=' + (process.env.PORT || '-') +
    ', DATABASE_URL ' + (process.env.DATABASE_URL ? 'set (' + process.env.DATABASE_URL.split(':')[0] + ')' : 'NOT SET') +
    ', rss ' + Math.round(mem.rss / 1048576) + ' MB' +
    ', dir ' + __dirname,
);

// Note when the server starts listening (under Passenger, its own listen hook takes over the port).
const listen = http.Server.prototype.listen;
http.Server.prototype.listen = function (...args) {
  log('listening (' + args.filter(a => typeof a !== 'function').map(a => JSON.stringify(a)).join(', ') + ')');
  return listen.apply(this, args);
};

try {
  const modules = path.join(__dirname, '.next', 'node_modules');
  if (!fs.existsSync(path.join(modules, 'next', 'package.json'))) {
    throw new Error('Missing ' + modules + '/next — upload and extract the whole zip, including the hidden .next folder.');
  }
  process.env.NODE_PATH = [modules, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
  Module._initPaths();
  require('./server.js');
  log('server.js loaded');
} catch (err) {
  log('STARTUP FAILED: ' + (err && err.stack ? err.stack : err));
  http
    .createServer((req, res) => {
      res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end('The site could not start. The administrator can find the reason in startup.log in the application folder.\n');
    })
    .listen(process.env.PORT || 3000);
}
