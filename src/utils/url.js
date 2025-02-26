const axios = require('axios');

async function normalizeUrl(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    try {
      await axios.get('https://' + url);
      url = 'https://' + url;
    } catch (error) {
      url = 'http://' + url;
    }
  }
  return url;
}

function getDomainName(url) {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, '');
  } catch (error) {
    return url;
  }
}

module.exports = {
  normalizeUrl,
  getDomainName
};
