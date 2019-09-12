/*
 * 
 * (C) 2016 Antoine Bigard
 * UnLICENCE
 *
 */

    var util = require('util'),
    winston = require('winston'),
    Transport = require('../../winston/lib/winston/transports/transport').Transport;
    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
    var AdsumClientAnalytics = require('../../adsum-client-analytics/build/adsum-client-analytics.es6.js');


//
// ### function ACA (options)
// #### @options {Object} Options for this instance.
// Constructor function for the ACA transport object responsible
// for persisting log messages and metadata to a terminal or TTY.
//
var ACA = exports.ACA = function (options) {
  Transport.call(this, options);
  options = options || {};

  this.name = 'aca';

  this.distEndPoint = options.distEndPoint || "http://127.0.0.1:9001/local-analytics/";
  this.analyticsSite = options.analyticsSite || 116;
  this.token = options.token || "f4a8be0670524ee957374a44dfe278e9";
  this.site = options.site || 240;
  this.device = options.device || 170;
  this.label = options.label || null;

  this.am = new AdsumClientAnalytics.AnalyticsManager({
    distEndPoint: this.distEndPoint,
    analyticsSite: this.analyticsSite,
    token: this.token,
    site: this.site,
    device: this.device
  }); 
  this.am.start();
  this.am.XMLHttpRequest = XMLHttpRequest;

};

util.inherits(ACA, winston.Transport);

//
// Expose the name of this Transport on the prototype
//
ACA.prototype.name = 'aca';

//
// ### function log (level, msg, [meta], callback)
// #### @level {string} Level at which to log the message.
// #### @msg {string} Message to log
// #### @meta {Object} **Optional** Additional metadata to attach
// #### @callback {function} Continuation to respond to when complete.
// Core logging method exposed to Winston. Metadata is optional.
//
ACA.prototype.log = function (level, msg, meta, callback) {
  var self = this;

  if (typeof meta === 'function') {
    callback = meta;
    meta = {};
  }

  var options = {
    method: 'collect',
    params: {
      level: level,
      message: msg,
      meta: meta
    }
  };

  if (meta) {
    if (meta.path) {
      options.path = meta.path;
      delete meta.path;
    }

    if (meta.auth) {
      options.auth = meta.auth;
      delete meta.auth;
    }
  }

  var code = 0;
  switch(level){
    case 'debug':
      code = 1000;
    break;
    case 'info':
      code = 2000;
    break;
    case 'warn':
      code = 3000;
    break;
    case 'error':
      code = 4000;
    break;
    case 'fatal':
      code = 5000;
    break;
    default:
      code = level;
    break;
  }

  if(code){
    this.am.trackLog(code,`[${this.label}] ${msg}`).then(function(){
      // TODO: emit 'logged' correctly,
      // keep track of pending logs.
      self.emit('logged');

      if (callback) callback(null, true);
    });
  }
};