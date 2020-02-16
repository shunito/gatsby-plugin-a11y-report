const path = require('path');

// Logger Settings
const winston = require('winston');

const { format } = winston;
require('winston-daily-rotate-file');

// axe report Settings
const express = require('express');
const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('axe-puppeteer');

// plugin configuration
const config = {};

// verification server
const gatsbyRootDir = path.resolve(process.cwd());
const publicPath = path.join(gatsbyRootDir, 'public');
const app = express();
app.use(express.static(publicPath));
let server = {};

const replacePath = (path) => (path === '/' ? path : path.replace(/\/$/, ''));

// Logging Settings
// TODO: Load configure from gatsby-config
const axeLogTransport = new (winston.transports.DailyRotateFile)({
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
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.json()
      )
    }),
    axeLogTransport
  ]
});

const logResults = (path, level, type, results) => {
  results.forEach((result) => {
    result.nodes.forEach((node) => {
      const message = {
        path,
        result: type,
        id: result.id,
        impact: result.impact || 'none',
        description: result.description,
        html: node.html,
        target: node.target
      };

      logger.log(level, message);
    });
  });
};

const loggingAxeResults = (path, results) => {
  const obj = config.logging;

  if (obj.includes('violations') && results.violations) {
    logResults(path, 'error', 'violations', results.violations);
  }

  if (obj.includes('incomplete') && results.incomplete) {
    logResults(path, 'error', 'incomplete', results.incomplete);
  }

  if (obj.includes('inapplicable') && results.inapplicable) {
    logResults(path, 'info', 'inapplicable', results.inapplicable);
  }

  if (obj.includes('passes') && results.passes) {
    logResults(path, 'info', 'passes', results.passes);
  }
};

const checkPages = async (buildPages) => {
  const { host, port } = config.server;
  const serverRoot = `http://${host}:${port}`;

  // ignore path
  const { ignore } = config;

  const promises = [];
  const browser = await puppeteer.launch();
  const userAgentString = await browser.userAgent();

  logger.log('verbose', {
    title: 'Gatsby A11y verification-server start..',
    server: serverRoot,
  });

  // const device = puppeteer.devices['iPhone 8'];
  // TODO: Move device settings to gatsby-config
  const device = {
    name: 'Chrome',
    userAgent: userAgentString,
    viewport: {
      width: 1280,
      height: 600,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      isLandscape: false
    }
  };

  // filter Unique page
  let pages = buildPages.filter((elem, index, self) => self.indexOf(elem) === index);

  // ignore pages
  ignore.forEach((pattern) => {
    const regex = new RegExp(pattern);
    pages = pages.filter((page) => (page.search(regex) < 0));
  });

  // Counter
  let violations = 0;
  let incomplete = 0;

  logger.log('info', {
    title: 'Gatsby Build: A11y Check Start',
    pages: pages.length,
    logging: config.logging,
    ignore,
    device
  });

  pages.forEach((pagePath) => {
    promises.push(browser.newPage().then(async (page) => {
      const pageUrl = new URL(pagePath, serverRoot);
      await page.setBypassCSP(true);
      await page.emulate(device);
      await page.goto(`${pageUrl}`);

      const results = await new AxePuppeteer(page)
        .configure(config.axe)
        .analyze();

      loggingAxeResults(pagePath, results);

      if (results.violations) {
        violations += results.violations.length;
      }

      if (results.incomplete) {
        incomplete += results.incomplete.length;
      }

      await page.close();
    }));
  });
  await Promise.all(promises);

  logger.log('info', {
    title: 'Gatsby Build: A11y Check Complete',
    complete: true,
    violations,
    incomplete
  });

  await browser.close();
};

exports.onPreInit = (_, pluginOptions) => {
  const {
    axeOptions,
    serverOptions,
    loggingOptions,
    ignoreCheck
  } = {
    axeOptions: {},
    serverOptions: {
      host: 'localhost',
      port: '8341'
    },
    loggingOptions: {
      result: ['violations']
    },
    ...pluginOptions
  };
  const axeConfig = {};

  // Start
  server = app.listen(serverOptions.port, serverOptions.host);

  // get Locale Language
  const { env } = process;
  const lang = axeOptions.locale || env.LANG || env.LANGUAGE || env.LC_ALL || env.LC_MESSAGES;

  // TODO: Fix resolve axe supported Languages
  // console.log(`lang:${lang}`);
  const localeFilePath = `axe-core/locales/${lang}.json`;

  try {
    // eslint-disable-next-line import/no-dynamic-require
    const AXE_LOCALE = require(localeFilePath);
    const options = Object.assign(axeOptions, {
      locale: AXE_LOCALE
    });

    Object.assign(axeConfig, options);
  } catch {
    Object.assign(axeConfig, axeOptions);
  }

  Object.assign(config, {
    server: serverOptions,
    axe: axeConfig,
    logging: loggingOptions.result,
    ignore: ignoreCheck
  });
};

exports.onPostBuild = async (
  { graphql },
  pluginOptions
) => {
  const { query } = pluginOptions;
  const pages = [];

  if (typeof query === 'undefined') {
    logger.error('query is require');
    return null;
  }

  const edges = await graphql(query).then((r) => {
    if (r.errors) {
      throw new Error(r.errors.join(', '));
    }
    return r.data.allSitePage.edges;
  });

  await edges.forEach((edge) => {
    if (edge.node.path) {
      const nodePath = replacePath(edge.node.path);
      pages.push(nodePath);
    }
  });

  await checkPages(pages);
  server.close();
  return null;
};