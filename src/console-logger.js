const axe = require('axe-core');

// Console Message Format
const boldCourier = 'font-weight:bold;font-family:Courier;';
const critical = 'color:red;font-weight:bold;';
const serious = 'color:red;font-weight:normal;';
const moderate = 'color:orange;font-weight:bold;';
const minor = 'color:orange;font-weight:normal;';
const defaultReset = 'font-color:black;font-weight:normal;';

const logReports = (reports, type) => {
  console.group(`%cNew aXe ${type} issues`, serious);
  reports.forEach((result) => {
    let fmt = serious;
    switch (result.impact) {
      case 'critical':
        fmt = critical;
        break;
      case 'serious':
        fmt = serious;
        break;
      case 'moderate':
        fmt = moderate;
        break;
      case 'minor':
        fmt = minor;
        break;
      default:
        fmt = minor;
        break;
    }

    console.groupCollapsed(
      '%c%s: %c%s %s',
      fmt,
      result.impact,
      defaultReset,
      result.help,
      result.helpUrl
    );

    result.nodes.forEach((node) => {
      failureSummary(node, 'any');
      failureSummary(node, 'none');
    });

    console.groupEnd();
  });
  console.groupEnd();
};

const logElement = (node, logFn) => {
  const el = document.querySelector(node.target.toString());
  if (!el) {
    logFn('Selector: %c%s', boldCourier, node.target.toString());
  } else {
    logFn('Element: %o', el);
  }
};

const logHtml = (node) => {
  console.log('HTML: %c%s', boldCourier, node.html);
};

const logFailureMessage = (node, key) => {
  const message = axe._audit.data.failureSummaries[key].failureMessage(
    node[key].map((check) => check.message || '')
  );

  console.error(message);
};

const failureSummary = (node, key) => {
  if (node[key].length > 0) {
    logElement(node, console.groupCollapsed);
    logHtml(node);
    logFailureMessage(node, key);

    let relatedNodes = [];
    node[key].forEach((check) => {
      relatedNodes = relatedNodes.concat(check.relatedNodes);
    });

    if (relatedNodes.length > 0) {
      console.groupCollapsed('Related nodes');
      relatedNodes.forEach((relatedNode) => {
        logElement(relatedNode, console.log);
        logHtml(relatedNode);
      });
      console.groupEnd();
    }
    console.groupEnd();
  }
};

const resultsAggregate = (results) => {
  const cache = {};
  return results.filter((result) => {
    result.nodes = result.nodes.filter((node) => {
      const key = node.target.toString() + result.id;
      const retVal = !cache[key];
      cache[key] = key;
      return retVal;
    });
    return !!result.nodes.length;
  });
};

const axeConsoleLog = (results) => {
  const violations = resultsAggregate(results.violations);
  const incomplete = resultsAggregate(results.incomplete);

  if (violations && violations.length > 0) {
    logReports(violations, 'violations');
  }

  if (incomplete && incomplete.length > 0) {
    logReports(incomplete, 'incomplete');
  }
};

module.exports = axeConsoleLog;