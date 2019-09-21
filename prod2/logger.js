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

var stripInfo = printf(({
  timestamp,
  level,
  message,
  meta
}) => {
  var err = `\n ${JSON.stringify(message.err, null, 2)}\n `
  return `${timestamp} ${level} : ${message.endpoint} - ${message.duration} ${message.err.length > 0 ? err : ''}`;
});


var logger;
var methodLogger;


var createConsoleLogger = () => {
  return createLogger({
    format: combine(
      timestamp(),
      stripInfo
    ),
    transports: [
      new transports.Console()
    ]
  });
}


var createElasticLogger = () => {

  var elasticLogger = createLogger();


  var client = new elasticsearch.Client({
    host: cred.ELASTIC_SEARCH_URL,
    log: 'info'

  });

  elasticLogger.add(new winston_elasticsearch({
    client,
    index: "logging"
  }));

  return elasticLogger
}

var createMethodLogger = () => {

  var elasticLogger = createLogger();


  var client = new elasticsearch.Client({
    host: cred.ELASTIC_SEARCH_URL,
    log: 'info'
  });

  elasticLogger.add(new winston_elasticsearch({
    client,
    index: "method"
  }));

  return elasticLogger

}


switch (process.env.NODE_ENV) {

  case "dev":
    //for local developtment
    logger = createLogger();
    logger.add(createConsoleLogger())

    methodLogger = {
      info: function() {},
      error: function() {}
    }
    break;
  case "production":
    //for running on server 
    logger = createLogger();
    logger.add(createConsoleLogger())
    logger.add(createElasticLogger())

    methodLogger = createLogger()
    methodLogger.add(createMethodLogger())
    break;
  default:
    //FOR TESTING with npm test only
    logger = {
      info: function() {},
      error: function() {}
    }
    methodLogger = {
      info: function() {},
      error: function() {}
    }
    break;
}


module.exports = {
  MAIN_LOGGER: logger,
  METHOD_LOGGER: methodLogger
}