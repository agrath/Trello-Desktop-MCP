import { jest } from '@jest/globals';
import { TrelloClient } from '../src/trello/client.js';
import type { TrelloError } from '../src/types/trello.js';

// Mock logger and insights to avoid side effects
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.unstable_mockModule('../src/utils/appInsights.js', () => ({
  insights: {
    trackEvent: jest.fn(),
    trackDependency: jest.fn(),
    trackException: jest.fn()
  }
}));

// Must dynamically import after mocking
const { TrelloClient: Client } = await import('../src/trello/client.js');

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

function createMockResponse(body: unknown, options: { status?: number; statusText?: string; headers?: Record<string, string> } = {}): Response {
  const { status = 200, statusText = 'OK', headers = {} } = options;
  const responseHeaders = new Headers(headers);
  const bodyStr = JSON.stringify(body);

  return new Response(bodyStr, {
    status,
    statusText,
    headers: responseHeaders
  });
}

describe('TrelloClient', () => {
  let client: InstanceType<typeof Client>;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new Client({ apiKey: 'test-key', token: 'test-token' });
  });

  describe('successful API calls', () => {
    it('should make a GET request for getMyBoards', async () => {
      const boards = [{ id: 'board1', name: 'Test Board' }];
      mockFetch.mockResolvedValueOnce(createMockResponse(boards));

      const result = await client.getMyBoards();

      expect(result.data).toEqual(boards);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/members/me/boards');
      expect(calledUrl).toContain('key=test-key');
      expect(calledUrl).toContain('token=test-token');
    });

    it('should make a POST request for createCard', async () => {
      const card = { id: 'card1', name: 'New Card' };
      mockFetch.mockResolvedValueOnce(createMockResponse(card));

      const result = await client.createCard({ name: 'New Card', idList: 'list1' });

      expect(result.data).toEqual(card);
      const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
      expect(calledOptions.method).toBe('POST');
      expect(calledOptions.body).toBe(JSON.stringify({ name: 'New Card', idList: 'list1' }));
    });

    it('should make a PUT request for updateCard', async () => {
      const card = { id: 'card1', name: 'Updated Card' };
      mockFetch.mockResolvedValueOnce(createMockResponse(card));

      const result = await client.updateCard('card1', { name: 'Updated Card' });

      expect(result.data).toEqual(card);
      const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
      expect(calledOptions.method).toBe('PUT');
    });

    it('should make a DELETE request for deleteCard', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await client.deleteCard('card1');

      const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
      expect(calledOptions.method).toBe('DELETE');
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/cards/card1');
    });
  });

  describe('error handling', () => {
    it('should throw a structured error on 401', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, { status: 401, statusText: 'Unauthorized' }));
      mockFetch.mockResolvedValueOnce(createMockResponse(null, { status: 401, statusText: 'Unauthorized' }));
      mockFetch.mockResolvedValueOnce(createMockResponse(null, { status: 401, statusText: 'Unauthorized' }));

      try {
        await client.getMyBoards();
        fail('Expected error to be thrown');
      } catch (error) {
        const trelloError = error as TrelloError;
        expect(trelloError.code).toBe('INVALID_CREDENTIALS');
        expect(trelloError.status).toBe(401);
      }
    });

    it('should throw a structured error on 403', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, { status: 403, statusText: 'Forbidden' }));
      mockFetch.mockResolvedValueOnce(createMockResponse(null, { status: 403, statusText: 'Forbidden' }));
      mockFetch.mockResolvedValueOnce(createMockResponse(null, { status: 403, statusText: 'Forbidden' }));

      try {
        await client.getMyBoards();
        fail('Expected error to be thrown');
      } catch (error) {
        const trelloError = error as TrelloError;
        expect(trelloError.code).toBe('INSUFFICIENT_PERMISSIONS');
        expect(trelloError.status).toBe(403);
      }
    });

    it('should throw NOT_FOUND on 404 without retrying', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, { status: 404, statusText: 'Not Found' }));

      try {
        await client.getCard('nonexistent');
        fail('Expected error to be thrown');
      } catch (error) {
        const trelloError = error as TrelloError;
        expect(trelloError.code).toBe('NOT_FOUND');
        expect(trelloError.status).toBe(404);
      }

      // 404 should NOT be retried, so fetch should only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw on 500 after retries', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, { status: 500, statusText: 'Internal Server Error' }));

      try {
        await client.getMyBoards();
        fail('Expected error to be thrown');
      } catch (error) {
        const trelloError = error as TrelloError;
        expect(trelloError.code).toBe('SERVER_ERROR');
        expect(trelloError.status).toBe(500);
      }

      // 500 should be retried (3 attempts total)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('retry logic', () => {
    it('should retry on 500 errors and succeed on second attempt', async () => {
      const boards = [{ id: 'board1', name: 'Test Board' }];
      mockFetch
        .mockResolvedValueOnce(createMockResponse(null, { status: 500, statusText: 'Internal Server Error' }))
        .mockResolvedValueOnce(createMockResponse(boards));

      const result = await client.getMyBoards();

      expect(result.data).toEqual(boards);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 404 errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, { status: 404, statusText: 'Not Found' }));

      try {
        await client.getCard('bad-id');
        fail('Expected error');
      } catch (_error) {
        // expected
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 401 errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(null, { status: 401, statusText: 'Unauthorized' }));

      try {
        await client.getMyBoards();
        fail('Expected error');
      } catch (_error) {
        // expected
      }

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('rate limit extraction', () => {
    it('should extract rate limit info from response headers', async () => {
      const boards = [{ id: 'board1' }];
      mockFetch.mockResolvedValueOnce(createMockResponse(boards, {
        headers: {
          'x-rate-limit-api-key-limit': '300',
          'x-rate-limit-api-key-remaining': '295',
          'x-rate-limit-api-key-reset': '10'
        }
      }));

      const result = await client.getMyBoards();

      expect(result.rateLimit).toEqual({
        limit: 300,
        remaining: 295,
        resetTime: 10
      });
    });

    it('should return undefined rateLimit when headers are absent', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([{ id: 'board1' }]));

      const result = await client.getMyBoards();

      expect(result.rateLimit).toBeUndefined();
    });
  });

  describe('URL building', () => {
    it('should pass query params for getListCards with filter', async () => {
      const cards = [{ id: 'card1' }];
      mockFetch.mockResolvedValueOnce(createMockResponse(cards));

      await client.getListCards('list1', { filter: 'closed' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('filter=closed');
    });

    it('should include customFieldItems=true for getCard', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'card1' }));

      await client.getCard('card1');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('customFieldItems=true');
    });
  });
});
