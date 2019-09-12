"use strict";


let winston = require('winston');
let adsumClientAnalyticsTransport = require('./transport/aca.js').ACA;

let _name = new WeakMap();
let _level = new WeakMap();
let _actions = new WeakMap();
let _frequency = new WeakMap();
let _updateTimeout = new WeakMap();
let _stop = new WeakMap();

class NodeLogger {
    constructor(args) {
        //{name, level, label, ACANTransport, frequency, FileTransport}
        _name.set(this, args.name);
        _actions.set(this, new Map());
        _updateTimeout.set(this, new Map());
        _stop.set(this, false);

        var customLevels = {
            levels: { fatal: 0, error: 1, warn: 2, info: 3, verbose: 4, debug: 5, silly: 6 },
            colors: {
                fatal: 'red',
                error: 'red',
                warn: 'yellow',
                info: 'green',
                verbose: 'cyan',
                debug: 'blue',
                silly: 'magenta'
            }
        };

        this.logger = new (winston.Logger)({
            levels: customLevels.levels,
            transports:
                [
                    new (winston.transports.Console)({
                        level: args.level,
                        colorize: true,
                        label: args.label
                    })
                ],
            colors:customLevels.colors
        });

        this.level = args.level;
        this.frequency = args.frequency;

        if(args.ACANTransport){
            args.ACANTransport.level = args.level;
            args.ACANTransport.label = args.label;
            this.useAdsumClientAnalytics(args.ACANTransport);
        }

        if(args.FileTransport){
            args.FileTransport.level = args.level;
            args.FileTransport.label = args.label;
            this.logger.add(winston.transports.File,args.FileTransport);
        }

    }

    get name() {
        return _name.get(this);
    }

    get level() {
        return _level.get(this);
    }

    set level(level) {
        this.logger.level = level;
        _level.set(this, level);
    }

    get frequency() {
        return _frequency.get(this);
    }

    set frequency(frequency) {
        _frequency.set(this, frequency || 1000);
    }

    start(name, context, count) {
        if (_stop.get(this)) {
            // Silent return
            return;
        }

        let actions = _actions.get(this);
        if (actions.has(name)) {
            throw new Error(`Unable to start action ${name} as it's already defined`);
        }
        let status = {
            count: 1,
            current: 0
        };

        if (count || count === 0) {
            status.count = count;
        }

        actions.set(name, status);
        this.status(name, context);
    }

    useAdsumClientAnalytics(options){
        this.logger.add(adsumClientAnalyticsTransport,options);
    }

    inc(name, context, n) {
        if (_stop.get(this)) {
            // Silent return
            return;
        }

        let actions = _actions.get(this);
        if (!actions.has(name)) {
            throw new Error(`Unable to action ${name} is not defined`);
        }
        n = n || 1;

        let status = actions.get(name);

        if (n > 0) {
            status.count += n;
        } else {
            status.current -= n;
        }
        actions.set(name, status);

        this.status(name, context);
    }

    dec(name, context, n) {
        n = n || 1;

        return this.inc(name, context, -1 * n);
    }

    status(name, sillyContext) {
        if (_stop.get(this)) {
            // Silent return
            return;
        }

        let actions = _actions.get(this);
        if (!actions.has(name)) {
            throw new Error(`Unable to action ${name} is not defined`);
        }

        let status = actions.get(name);

        if (status.count === 0) {
            // Simply ignore
            return;
        }

        let progress = parseInt(100 * status.current / status.count);
        let message = `${name} - ${status.current}/${status.count} (${progress}%)`;

        if (this.level === 'silly') {
            this.info(message, sillyContext);

            return;
        }

        // If not debug: retain some to prevent flooding
        if (!_updateTimeout.get(this).has(name)) {
            // The first time ! Do it now !
            _updateTimeout.get(this).set(name, null);
            this.info(message);

            return;
        }

        // There is no active timeout !
        if (_updateTimeout.get(this).get(name) === null) {
            let timeout = setTimeout(() => {
                _updateTimeout.get(this).set(name, null);
                this.info(message);
            }, this.frequency);

            _updateTimeout.get(this).set(name, timeout);
        }
    }

    clear() {
        for (let name of _updateTimeout.get(this).keys()) {
            let timeout = _updateTimeout.get(this).get(name);
            if (timeout !== null) {
                clearTimeout(timeout);
                _updateTimeout.get(this).set(name, null);
                let status = _actions.get(this).get(name);
                if (status.count === 0) {
                    return;
                }

                let progress = parseInt(100 * status.current / status.count);
                let message = `${name} - ${status.current}/${status.count} (${progress}%)`;
                this.info(message);
            }
        }
    }

    open() {
        _stop.set(this, false);
    }

    close() {
        this.clear();
        _stop.set(this, true);
    }

    log(level, msg, context){
        this.logger.log(level, msg, context);
    }

    silly(msg, context) {
        if (_stop.get(this)) {
            // Silent return
            return;
        }

        if (this.isDebug() && context !== null && typeof context === 'object') {
            this.logger.log('silly',  msg, context);
        } else {
            this.logger.log('silly',  msg);
        }
    }

    debug(msg, context) {
        if (_stop.get(this)) {
            // Silent return
            return;
        }

        if (this.isDebug() && context !== null && typeof context === 'object') {
            this.logger.log('debug',  msg, context);
        } else {
            this.logger.log('debug',  msg);
        }
    }

    verbose(msg, context) {
        if (_stop.get(this)) {
            // Silent return
            return;
        }

        if (this.isDebug() && context !== null && typeof context === 'object') {
            this.logger.log('verbose',  msg, context);
        } else {
            this.logger.log('verbose',  msg);
        }
    }

    info(msg, context) {
        if (_stop.get(this)) {
            // Silent return
            return;
        }

        if (this.isDebug() && context !== null && typeof context === 'object') {
            this.logger.log('info',  msg, context);
        } else {
            this.logger.log('info',  msg);
        }
    }

    warn(msg, context, err) {
        if (_stop.get(this)) {
            // Silent return
            return;
        }

        this.clear();
        if (this.isDebug() && context !== null && typeof context === 'object') {
            if(err instanceof Error) {
                let ctx = {};
                ctx.message = err.message;
                ctx.stack = err.stack.replace(/(\n|\t|[ ]{2,})+/gi, '; ');
                this.logger.log('warn',  msg, {
                    context,
                    ctx
                });
            } else {
                this.logger.log('warn',  msg, context);
            }
        } else {
            this.logger.log('warn',  msg);
        }
    }

    error(msg, context, err) {
        if (_stop.get(this)) {
            // Silent return
            return;
        }

        this.clear();
        if (this.isDebug() && context !== null && typeof context === 'object') {
            if(err instanceof Error) {
                let ctx = {};
                ctx.message = err.message;
                ctx.stack = err.stack.replace(/(\n|\t|[ ]{2,})+/gi, '; ');
                this.logger.log('error',  msg, {
                    context,
                    ctx
                });
            } else {
                this.logger.log('error',  msg, context);
            }
        } else {
            this.logger.log('error',  msg);
        }

        return msg;
    }

    fatal(msg, context, err) {
        if (_stop.get(this)) {
            // Silent return
            return;
        }

        this.clear();
        if (this.isDebug() && context !== null && typeof context === 'object') {
            if(err instanceof Error) {
                let ctx = {};
                ctx.message = err.message;
                ctx.stack = err.stack.replace(/(\n|\t|[ ]{2,})+/gi, '; ');
                this.logger.log('fatal',  msg, {
                    context,
                    ctx
                });
            } else {
                this.logger.log('fatal',  msg, context);
            }
        } else {
            this.logger.log('fatal',  msg);
        }

        return msg;
    }

    isDebug() {
        return ['debug', 'silly'].indexOf(this.level) !== -1;
    }
}

Map.prototype.add = function(args){
    if(!args.name){
        throw new Error("Logger : A name must be provide");
    }
    if(!args.level){
        throw new Error("Logger : A level must be provide");
    }
    this.set(args.name,new NodeLogger(args));
};

let loggers = new Map();

module.exports = { loggers };