const axios = require('axios');
const { sanitizeInput } = require('./sanitize');

async function normalizeUrl(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    try {
      await axios.get('https://' + url);
      url = 'https://' + url;
    } catch (error) {
      url = 'http://' + url;
    }
  }
  return sanitizeInput(url);
}

function getDomainName(url) {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, '');
  } catch (error) {
    return sanitizeInput(url);
  }
}

module.exports = {
  normalizeUrl,
  getDomainName
};
