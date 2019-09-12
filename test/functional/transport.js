
const NodeLogger = require("../../node-logger");

NodeLogger.loggers.add(
    {
        name: "TEST",
        level: "debug",
        label: "TS",
        ACANTransport: {
            distEndPoint: "http://127.0.0.1:9002/local-analytics/",
            analyticsSite: 116,
            token: "f4a8be0670524ee957374a44dfe278e9",
            site: 240,
            device: 170
        }
    }
);

let logger = NodeLogger.loggers.get("TEST");

logger.debug("Debug");
logger.info("Information");
logger.warn("Warning");
logger.error("Error");
logger.fatal("Fatal");
