'use strict';

var util = require('util');
var http = require('http');
var EventEmitter = require('events').EventEmitter;
var once = require('once');
var httpHeaders = require('http-headers');

var StatsEmitter = function () {
  EventEmitter.call(this);
};
util.inherits(StatsEmitter, EventEmitter);

StatsEmitter.prototype._server = function (server, onStats) {
  this._attach(onStats);
  server.on('request', this._request.bind(this));
};

StatsEmitter.prototype._request = function (req, res, onStats) {
  var that = this;
  var start = new Date();

  this._attach(onStats);

  var emit = once(function (ok) {
    that.emit('stats', {
      ok   : ok,
      time : new Date() - start,
      req  : {
        bytes   : req.connection.bytesRead,
        headers : req.headers,
        method  : req.method,
        path    : req.url
      },
      res  : {
        bytes   : req.connection.bytesWritten,
        headers : httpHeaders(res),
        status  : res.statusCode
      }
    });
  });

  res.once('finish', emit.bind(null, true));
  res.once('close', emit.bind(null, false));
};

StatsEmitter.prototype._attach = function (listener) {
  if (typeof listener === 'function')
    this.on('stats', listener);
};

var requestStats = function (req, res, onStats) {
  var statsEmitter = new StatsEmitter();
  if (req instanceof http.Server)
    statsEmitter._server(req, res);
  else if (req instanceof http.IncomingMessage)
    statsEmitter._request(req, res, onStats);
  return statsEmitter;
};

module.exports = requestStats;
