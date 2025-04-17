import { describe, it, expect, vi, beforeEach } from 'vitest';
const { normalizeUrl, getDomainName } = require('../../src/utils/url');
const axios = require('axios');


describe('normalizeUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the same url if starts with https://', async () => {
    const url = 'https://example.com';
    const spy = vi.spyOn(axios, 'get').mockResolvedValueOnce({});

    const result = await normalizeUrl(url);

    expect(result).toBe(url);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should add https:// and do a test request', async () => {
    const spy = vi.spyOn(axios, 'get').mockResolvedValueOnce({});

    const result = await normalizeUrl('example.com');

    expect(result).toBe('https://example.com');
    expect(spy).toHaveBeenCalledWith('https://example.com');
  });

  it('should add http:// if the requests fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('HTTPS failed'));

    const result = await normalizeUrl('example.com');

    expect(result).toBe('http://example.com');
    expect(axios.get).toHaveBeenCalledWith('https://example.com');
  });
});

describe('getDomainName', () => {
  it('should returns example.com if given https://example.com/helloworld', () => {
    expect(getDomainName('https://example.com/helloworld')).toBe('example.com');
  });

  it('should returns sub.example.com if given https://sub.example.com/helloworld', () => {
    expect(getDomainName('https://sub.example.com/helloworld')).toBe('sub.example.com');
  });

  it('should returns example.com if given https://www.example.com/helloworld', () => {
    expect(getDomainName('https://www.example.com/helloworld')).toBe('example.com');
  });
});