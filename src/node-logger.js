// Logger Settings
const winston = require('winston');

const { format } = winston;
require('winston-daily-rotate-file');

// Logging Settings
// TODO: Load configure from gatsby-config
const axeLogTransport = new(winston.transports.DailyRotateFile)({
  level: 'info',
  filename: 'axe-report-%DATE%.log',
  dirname: 'logs',
  datePattern: 'YYYY-MM-DD-HH',
  format: format.combine(format.timestamp(), format.splat(), format.json()),
  zippedArchive: true,
  maxSize: '100m',
  maxFiles: '14d'
});

const logger = winston.createLogger({
  level: 'info',
  defaultMeta: {
    service: 'axe-report'
  },
  transports: [
    new winston
    .transports
    .Console({
      level: 'info',
      format: winston
        .format
        .combine(winston.format.colorize(), winston.format.json())
    }),
    axeLogTransport
  ]
});

module.exports = logger;