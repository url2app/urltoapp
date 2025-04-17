const { normalizeUrl, getDomainName } = require('../../src/utils/url');
const axios = require('axios');

jest.mock('axios');
console.log = jest.fn();

describe('normalizeUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return the same url if starts with https://', async () => {
    const url = 'https://example.com';

    const spy = jest.spyOn(axios, 'get');

    const result = await normalizeUrl(url);

    expect(result).toBe(url);
    expect(spy).not.toHaveBeenCalled();
  });

  test('should add https:// and do a test request', async () => {
    axios.get.mockResolvedValueOnce({});

    const result = await normalizeUrl('example.com');

    expect(result).toBe('https://example.com');
    expect(axios.get).toHaveBeenCalledWith('https://example.com');
  });

  test('should add http:// if the request fails', async () => {
    axios.get.mockImplementationOnce(() => {
      return Promise.reject(new Error('HTTPS failed'));
    });

    const result = await normalizeUrl('example.com');

    expect(result).toBe('http://example.com');
    expect(axios.get).toHaveBeenCalledWith('https://example.com');
  });
});

describe('getDomainName', () => {
  test('should return example.com if given https://example.com/helloworld', () => {
    expect(getDomainName('https://example.com/helloworld')).toBe('example.com');
  });

  test('should return sub.example.com if given https://sub.example.com/helloworld', () => {
    expect(getDomainName('https://sub.example.com/helloworld')).toBe('sub.example.com');
  });

  test('should return example.com if given https://www.example.com/helloworld', () => {
    expect(getDomainName('https://www.example.com/helloworld')).toBe('example.com');
  });
});