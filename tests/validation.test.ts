import { jest } from '@jest/globals';
import {
  extractTrelloId,
  extractCredentials,
  createCardSchema,
  updateCardSchema,
  listBoardsSchema,
  getCardSchema,
  getBoardSchema,
  moveCardSchema,
  formatValidationError
} from '../src/utils/validation.js';
import { ZodError } from 'zod';

describe('extractTrelloId', () => {
  it('should extract ID from a board URL', () => {
    expect(extractTrelloId('https://trello.com/b/lntO1GVb/board-name')).toBe('lntO1GVb');
  });

  it('should extract ID from a card URL', () => {
    expect(extractTrelloId('https://trello.com/c/EOY1CRmz/18-project-plan')).toBe('EOY1CRmz');
  });

  it('should extract ID from a URL with uppercase path', () => {
    expect(extractTrelloId('https://trello.com/B/lntO1GVb/board-name')).toBe('lntO1GVb');
  });

  it('should return a short ID as-is', () => {
    expect(extractTrelloId('EOY1CRmz')).toBe('EOY1CRmz');
  });

  it('should return a full 24-char hex ID as-is', () => {
    expect(extractTrelloId('507f1f77bcf86cd799439011')).toBe('507f1f77bcf86cd799439011');
  });

  it('should trim whitespace from input', () => {
    expect(extractTrelloId('  EOY1CRmz  ')).toBe('EOY1CRmz');
  });

  it('should return empty string for empty input', () => {
    expect(extractTrelloId('')).toBe('');
  });

  it('should return non-URL text as-is when it does not match URL pattern', () => {
    expect(extractTrelloId('some-random-text')).toBe('some-random-text');
  });
});

describe('extractCredentials', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TRELLO_API_KEY;
    delete process.env.TRELLO_TOKEN;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should extract credentials from args', () => {
    const result = extractCredentials({
      apiKey: 'test-key',
      token: 'test-token',
      boardId: 'abc123'
    });

    expect(result.credentials).toEqual({
      apiKey: 'test-key',
      token: 'test-token'
    });
    expect(result.params).toEqual({ boardId: 'abc123' });
  });

  it('should fall back to env vars when args do not include credentials', () => {
    process.env.TRELLO_API_KEY = 'env-key';
    process.env.TRELLO_TOKEN = 'env-token';

    const result = extractCredentials({ boardId: 'abc123' });

    expect(result.credentials).toEqual({
      apiKey: 'env-key',
      token: 'env-token'
    });
    expect(result.params).toEqual({ boardId: 'abc123' });
  });

  it('should prefer args over env vars', () => {
    process.env.TRELLO_API_KEY = 'env-key';
    process.env.TRELLO_TOKEN = 'env-token';

    const result = extractCredentials({
      apiKey: 'arg-key',
      token: 'arg-token'
    });

    expect(result.credentials).toEqual({
      apiKey: 'arg-key',
      token: 'arg-token'
    });
  });

  it('should throw when credentials are missing entirely', () => {
    expect(() => extractCredentials({})).toThrow();
  });

  it('should throw when args is not an object', () => {
    expect(() => extractCredentials('invalid')).toThrow('Tool arguments must be an object.');
  });

  it('should handle null args with env vars', () => {
    process.env.TRELLO_API_KEY = 'env-key';
    process.env.TRELLO_TOKEN = 'env-token';

    const result = extractCredentials(null);
    expect(result.credentials).toEqual({
      apiKey: 'env-key',
      token: 'env-token'
    });
  });

  it('should handle undefined args with env vars', () => {
    process.env.TRELLO_API_KEY = 'env-key';
    process.env.TRELLO_TOKEN = 'env-token';

    const result = extractCredentials(undefined);
    expect(result.credentials).toEqual({
      apiKey: 'env-key',
      token: 'env-token'
    });
  });
});

describe('createCardSchema', () => {
  it('should validate a minimal card', () => {
    const result = createCardSchema.parse({
      name: 'Test Card',
      idList: 'abc123'
    });
    expect(result.name).toBe('Test Card');
    expect(result.idList).toBe('abc123');
  });

  it('should validate a card with all optional fields', () => {
    const result = createCardSchema.parse({
      name: 'Test Card',
      idList: 'abc123',
      desc: 'A description',
      pos: 'top',
      due: '2025-12-31T23:59:59Z',
      idMembers: ['member1'],
      idLabels: ['label1']
    });
    expect(result.desc).toBe('A description');
    expect(result.pos).toBe('top');
  });

  it('should reject a card without a name', () => {
    expect(() => createCardSchema.parse({ idList: 'abc123' })).toThrow();
  });

  it('should reject a card without idList', () => {
    expect(() => createCardSchema.parse({ name: 'Test' })).toThrow();
  });

  it('should reject an empty name', () => {
    expect(() => createCardSchema.parse({ name: '', idList: 'abc123' })).toThrow();
  });

  it('should transform Trello URLs in idList', () => {
    const result = createCardSchema.parse({
      name: 'Test Card',
      idList: 'https://trello.com/l/abc123/list-name'
    });
    expect(result.idList).toBe('abc123');
  });

  it('should accept numeric pos', () => {
    const result = createCardSchema.parse({
      name: 'Test Card',
      idList: 'abc123',
      pos: 42
    });
    expect(result.pos).toBe(42);
  });
});

describe('updateCardSchema', () => {
  it('should validate with just cardId', () => {
    const result = updateCardSchema.parse({ cardId: 'abc123' });
    expect(result.cardId).toBe('abc123');
  });

  it('should validate with all optional fields', () => {
    const result = updateCardSchema.parse({
      cardId: 'abc123',
      name: 'Updated',
      desc: 'New desc',
      closed: true,
      due: null,
      dueComplete: false,
      pos: 'bottom'
    });
    expect(result.name).toBe('Updated');
    expect(result.closed).toBe(true);
    expect(result.due).toBeNull();
  });

  it('should reject without cardId', () => {
    expect(() => updateCardSchema.parse({})).toThrow();
  });
});

describe('listBoardsSchema', () => {
  it('should default filter to open', () => {
    const result = listBoardsSchema.parse({});
    expect(result.filter).toBe('open');
  });

  it('should accept valid filter values', () => {
    expect(listBoardsSchema.parse({ filter: 'all' }).filter).toBe('all');
    expect(listBoardsSchema.parse({ filter: 'closed' }).filter).toBe('closed');
  });

  it('should reject invalid filter values', () => {
    expect(() => listBoardsSchema.parse({ filter: 'invalid' })).toThrow();
  });
});

describe('getCardSchema', () => {
  it('should validate with cardId', () => {
    const result = getCardSchema.parse({ cardId: 'abc123' });
    expect(result.cardId).toBe('abc123');
    expect(result.includeDetails).toBe(false);
  });

  it('should accept includeDetails', () => {
    const result = getCardSchema.parse({ cardId: 'abc123', includeDetails: true });
    expect(result.includeDetails).toBe(true);
  });
});

describe('moveCardSchema', () => {
  it('should validate with required fields', () => {
    const result = moveCardSchema.parse({ cardId: 'card1', idList: 'list1' });
    expect(result.cardId).toBe('card1');
    expect(result.idList).toBe('list1');
  });

  it('should reject without idList', () => {
    expect(() => moveCardSchema.parse({ cardId: 'card1' })).toThrow();
  });
});

describe('formatValidationError', () => {
  it('should format a ZodError into a readable string', () => {
    try {
      createCardSchema.parse({});
    } catch (error) {
      if (error instanceof ZodError) {
        const message = formatValidationError(error);
        expect(message).toContain('Validation error');
      }
    }
  });
});
