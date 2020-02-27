const axe = require('axe-core');
const { toast } = require('react-toastify');
const { css } = require('glamor');
const logger = require('./browser-logger');

require('react-toastify/dist/ReactToastify.css');

const showNotificationToast = (type, data) => {
  if (data.length === 0) {
    return;
  }

  switch (type) {
    case 'violations':
      toast.error(`${type}: ${data.length}`);
      break;
    case 'incomplete':
      toast.warn(`${type}: ${data.length}`);
      break;
    case 'inapplicable':
      toast.info(`${type}: ${data.length}`);
      break;
    case 'passes':
      toast.success(`${type}: ${data.length}`);
      break;
    default:
      break;
  }
};

exports.onClientEntry = (_, pluginOptions) => {
  const { axeOptions, toastAutoClose } = pluginOptions;

  // Contrast upgrade
  const toastBase = {
    color: '#fff',
    fontSize: '1.2rem'
  };

  const lang = axeOptions.locale
    || (window.navigator.languages && window.navigator.languages[0])
    || window.navigator.language || window.navigator.userLanguage
    || window.navigator.browserLanguage;

  const localeFilePath = `axe-core/locales/${lang}.json`;

  try {
    // eslint-disable-next-line import/no-dynamic-require
    const AXE_LOCALE = require(localeFilePath);
    const options = Object.assign(axeOptions, {
      locale: AXE_LOCALE
    });
    axe.configure(options);
  } catch {
    axe.configure(axeOptions);
  }

  toast.configure({
    autoClose: toastAutoClose,
    position: toast.POSITION.TOP_RIGHT,
    className: css(toastBase)
  });
  return null;
};

exports.onRouteUpdate = (_, pluginOptions = {}) => {
  const { showInProduction } = pluginOptions;

  if (process.env.NODE_ENV === 'development' || showInProduction) {
    axe.run((err, results) => {
      if (err) throw err; // console.log(results);

      logger(results);

      if (results.violations) {
        showNotificationToast('violations', results.violations);
      }

      if (results.incomplete) {
        showNotificationToast('incomplete', results.incomplete);
      }

      if (results.inapplicable) {
        showNotificationToast('inapplicable', results.inapplicable);
      }

      if (results.passes) {
        showNotificationToast('passes', results.passes);
      }
    });
  }

  return null;
};