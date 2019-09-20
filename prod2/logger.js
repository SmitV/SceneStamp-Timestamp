var cred = require('./credentials')
var elasticsearch = require('elasticsearch');
var winston_elasticsearch = require('winston-elasticsearch');
const {
  createLogger,
  format,
  transports
} = require('winston');
const {
  combine,
  timestamp,
  printf
} = format;

switch (process.env.NODE_ENV) {
  case "production":
    const stripInfo = printf(({
      timestamp,
      level,
      message,
      meta
    }) => {
      var err = `\n ${JSON.stringify(message.err, null, 2)}\n `
      return `${timestamp} ${level} : ${message.endpoint} - ${message.duration} ${message.err.length > 0 ? err : ''}`;
    });

    const consoleLogger = createLogger({
      format: combine(
        timestamp(),
        stripInfo
      ),
      transports: [
        new transports.Console()
      ]
    });

    const elasticLogger = createLogger();

    logger = createLogger();
    logger.add(consoleLogger)

    if (process.env.HEROKU_SERVER) {

      var client = new elasticsearch.Client({
        host: cred.ELASTIC_SEARCH_URL,
        log: 'info'

      });

      elasticLogger.add(new winston_elasticsearch({
        client,
        index: "logging"
      }));

      logger.add(elasticLogger)

    }

    break;
  default:
    logger = {
      info: function() {},
      error: function() {}
    }
    break;
}


module.exports = {
  MAIN_LOGGER: logger
}