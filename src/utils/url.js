const axios = require('axios');
const { sanitizeInput } = require('./sanitize');

async function normalizeUrl(url) {
  const sanitizedUrl = sanitizeInput(url);
  
  if (sanitizedUrl.startsWith('http://') || sanitizedUrl.startsWith('https://')) {
    return sanitizedUrl;
  }
  
  try {
    await axios.get('https://' + sanitizedUrl);
    return 'https://' + sanitizedUrl;
  } catch (error) {
    return 'http://' + sanitizedUrl;
  }
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