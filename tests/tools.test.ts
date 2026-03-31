import { jest } from '@jest/globals';

// Mock logger and insights
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

// Create mock client methods
const mockGetMyBoards = jest.fn();
const mockGetCard = jest.fn();
const mockGetListCards = jest.fn();
const mockGetBoardLists = jest.fn();
const mockUpdateCard = jest.fn();

jest.unstable_mockModule('../src/trello/client.js', () => ({
  TrelloClient: jest.fn().mockImplementation(() => ({
    getMyBoards: mockGetMyBoards,
    getCard: mockGetCard,
    getListCards: mockGetListCards,
    getBoardLists: mockGetBoardLists,
    updateCard: mockUpdateCard,
    getBoard: jest.fn(),
    createCard: jest.fn(),
    moveCard: jest.fn(),
    deleteCard: jest.fn(),
    search: jest.fn(),
    addCommentToCard: jest.fn(),
    createList: jest.fn()
  }))
}));

// Dynamically import after mocks
const { handleListBoards } = await import('../src/tools/boards.js');
const { handleGetCard, handleArchiveCard } = await import('../src/tools/cards.js');
const { handleTrelloGetListCards } = await import('../src/tools/lists.js');
const { handleTrelloFilterLists } = await import('../src/tools/boards.js');

describe('handleListBoards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TRELLO_API_KEY = 'test-key';
    process.env.TRELLO_TOKEN = 'test-token';
  });

  it('should return a list of boards', async () => {
    mockGetMyBoards.mockResolvedValueOnce({
      data: [
        {
          id: 'board1',
          name: 'My Board',
          desc: 'A test board',
          shortUrl: 'https://trello.com/b/board1',
          dateLastActivity: '2025-01-01T00:00:00Z',
          closed: false
        }
      ],
      rateLimit: { limit: 300, remaining: 299, resetTime: 10 }
    });

    const result = await handleListBoards({});

    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.summary).toContain('1');
    expect(parsed.boards).toHaveLength(1);
    expect(parsed.boards[0].name).toBe('My Board');
  });

  it('should handle empty board list', async () => {
    mockGetMyBoards.mockResolvedValueOnce({
      data: [],
      rateLimit: undefined
    });

    const result = await handleListBoards({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.boards).toHaveLength(0);
    expect(parsed.summary).toContain('0');
  });

  it('should return error when credentials are missing', async () => {
    delete process.env.TRELLO_API_KEY;
    delete process.env.TRELLO_TOKEN;

    const result = await handleListBoards({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error');
  });
});

describe('handleGetCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TRELLO_API_KEY = 'test-key';
    process.env.TRELLO_TOKEN = 'test-token';
  });

  it('should return card details', async () => {
    mockGetCard.mockResolvedValueOnce({
      data: {
        id: 'card1',
        name: 'Test Card',
        desc: 'Card description',
        shortUrl: 'https://trello.com/c/card1',
        idList: 'list1',
        idBoard: 'board1',
        pos: 1,
        due: null,
        dueComplete: false,
        closed: false,
        dateLastActivity: '2025-01-01T00:00:00Z',
        labels: [],
        members: [],
        checklists: []
      },
      rateLimit: undefined
    });

    const result = await handleGetCard({ cardId: 'card1' });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.card.id).toBe('card1');
    expect(parsed.card.name).toBe('Test Card');
    expect(parsed.summary).toContain('Test Card');
  });

  it('should return error for missing cardId', async () => {
    const result = await handleGetCard({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error');
  });

  it('should handle API errors gracefully', async () => {
    mockGetCard.mockRejectedValueOnce(new Error('Network failure'));

    const result = await handleGetCard({ cardId: 'card1' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Network failure');
  });
});

describe('handleTrelloGetListCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TRELLO_API_KEY = 'test-key';
    process.env.TRELLO_TOKEN = 'test-token';
  });

  const sampleCards = [
    {
      id: 'card1',
      name: 'Card One',
      desc: 'Description one',
      shortUrl: 'https://trello.com/c/card1',
      idList: 'list1',
      idBoard: 'board1',
      pos: 1,
      due: '2025-06-01T00:00:00Z',
      dueComplete: false,
      closed: false,
      dateLastActivity: '2025-01-01T00:00:00Z',
      labels: [{ id: 'label1', name: 'Bug', color: 'red' }],
      members: [{ id: 'mem1', fullName: 'John', username: 'john' }]
    },
    {
      id: 'card2',
      name: 'Card Two',
      desc: '',
      shortUrl: 'https://trello.com/c/card2',
      idList: 'list1',
      idBoard: 'board1',
      pos: 2,
      due: null,
      dueComplete: false,
      closed: false,
      dateLastActivity: '2025-01-02T00:00:00Z',
      labels: [],
      members: []
    }
  ];

  it('should return compact card list by default (compact=true)', async () => {
    mockGetListCards.mockResolvedValueOnce({
      data: sampleCards,
      rateLimit: undefined
    });

    const result = await handleTrelloGetListCards({ listId: 'list1' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cards).toHaveLength(2);
    // Compact mode: only id, name, url, listId
    expect(parsed.cards[0]).toEqual({
      id: 'card1',
      name: 'Card One',
      url: 'https://trello.com/c/card1',
      listId: 'list1'
    });
    // Should NOT have description, labels, members, etc.
    expect(parsed.cards[0].description).toBeUndefined();
    expect(parsed.cards[0].labels).toBeUndefined();
  });

  it('should return full card details when compact=false', async () => {
    mockGetListCards.mockResolvedValueOnce({
      data: sampleCards,
      rateLimit: undefined
    });

    const result = await handleTrelloGetListCards({ listId: 'list1', compact: false });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.cards).toHaveLength(2);
    // Full mode should include description, labels, members
    expect(parsed.cards[0].description).toBe('Description one');
    expect(parsed.cards[0].labels).toHaveLength(1);
    expect(parsed.cards[0].labels[0].name).toBe('Bug');
    expect(parsed.cards[0].members).toHaveLength(1);
    expect(parsed.cards[1].description).toBe('No description');
  });
});

describe('handleTrelloFilterLists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TRELLO_API_KEY = 'test-key';
    process.env.TRELLO_TOKEN = 'test-token';
  });

  const sampleLists = [
    { id: 'list1', name: 'To Do', pos: 1, closed: false, subscribed: false, idBoard: 'board1' },
    { id: 'list2', name: 'In Progress', pos: 2, closed: false, subscribed: false, idBoard: 'board1' },
    { id: 'list3', name: 'Done', pos: 3, closed: false, subscribed: false, idBoard: 'board1' }
  ];

  it('should filter lists by matching name (case-insensitive)', async () => {
    mockGetBoardLists.mockResolvedValueOnce({
      data: sampleLists,
      rateLimit: undefined
    });

    const result = await handleTrelloFilterLists({ boardId: 'board1', filter: 'progress' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.lists).toHaveLength(1);
    expect(parsed.lists[0].name).toBe('In Progress');
    expect(parsed.summary).toContain("1 list(s) matching 'progress'");
  });

  it('should return empty when no lists match', async () => {
    mockGetBoardLists.mockResolvedValueOnce({
      data: sampleLists,
      rateLimit: undefined
    });

    const result = await handleTrelloFilterLists({ boardId: 'board1', filter: 'nonexistent' });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.lists).toHaveLength(0);
    expect(parsed.summary).toContain('0 list(s)');
  });

  it('should return all lists when filter matches multiple', async () => {
    mockGetBoardLists.mockResolvedValueOnce({
      data: sampleLists,
      rateLimit: undefined
    });

    const result = await handleTrelloFilterLists({ boardId: 'board1', filter: 'o' });
    const parsed = JSON.parse(result.content[0].text);

    // "To Do", "In Progress", "Done" - all contain 'o'
    expect(parsed.lists.length).toBeGreaterThanOrEqual(2);
  });

  it('should return error when filter is missing', async () => {
    const result = await handleTrelloFilterLists({ boardId: 'board1' });
    expect(result.isError).toBe(true);
  });
});

describe('handleArchiveCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TRELLO_API_KEY = 'test-key';
    process.env.TRELLO_TOKEN = 'test-token';
  });

  it('should archive a card', async () => {
    mockUpdateCard.mockResolvedValueOnce({
      data: {
        id: 'card1',
        name: 'Archived Card',
        shortUrl: 'https://trello.com/c/card1',
        closed: true
      },
      rateLimit: undefined
    });

    const result = await handleArchiveCard({ cardId: 'card1', value: true });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.summary).toContain('archived');
    expect(parsed.card.closed).toBe(true);
  });

  it('should unarchive a card', async () => {
    mockUpdateCard.mockResolvedValueOnce({
      data: {
        id: 'card1',
        name: 'Unarchived Card',
        shortUrl: 'https://trello.com/c/card1',
        closed: false
      },
      rateLimit: undefined
    });

    const result = await handleArchiveCard({ cardId: 'card1', value: false });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.summary).toContain('unarchived');
    expect(parsed.card.closed).toBe(false);
  });

  it('should return error when value is missing', async () => {
    const result = await handleArchiveCard({ cardId: 'card1' });
    expect(result.isError).toBe(true);
  });
});
