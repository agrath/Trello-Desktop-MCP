import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TrelloClient } from '../trello/client.js';
import { 
  validateListBoards, 
  validateGetBoard, 
  validateGetBoardLists, 
  formatValidationError 
} from '../utils/validation.js';

export const listBoardsTool: Tool = {
  name: 'list_boards',
  description: 'List all Trello boards accessible to the user. Use this to see all boards you have access to, or filter by status.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: {
        type: 'string',
        description: 'Trello API key (automatically provided by Claude.app from your stored credentials)'
      },
      token: {
        type: 'string',
        description: 'Trello API token (automatically provided by Claude.app from your stored credentials)'
      },
      filter: {
        type: 'string',
        enum: ['all', 'open', 'closed'],
        description: 'Filter boards by status: "open" for active boards, "closed" for archived boards, "all" for both',
        default: 'open'
      }
    },
    required: ['apiKey', 'token']
  }
};

export async function handleListBoards(args: unknown) {
  try {
    const { apiKey, token, filter } = validateListBoards(args);
    const client = new TrelloClient({ apiKey, token });
    
    const response = await client.getMyBoards(filter);
    const boards = response.data;
    
    const summary = `Found ${boards.length} ${filter} board(s)`;
    const boardList = boards.map(board => ({
      id: board.id,
      name: board.name,
      description: board.desc || 'No description',
      url: board.shortUrl,
      lastActivity: board.dateLastActivity,
      closed: board.closed
    }));
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            summary,
            boards: boardList,
            rateLimit: response.rateLimit
          }, null, 2)
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof z.ZodError 
      ? formatValidationError(error)
      : error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
        
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error listing boards: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const getBoardDetailsTool: Tool = {
  name: 'get_board_details',
  description: 'Get information about a Trello board. IMPORTANT: Start with includeDetails=false (default) to get board metadata and lists only. Then use get_card or trello_get_list_cards to drill into specific cards. Only set includeDetails=true for small boards when you need a full overview.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: {
        type: 'string',
        description: 'Trello API key (automatically provided by Claude.app from your stored credentials)'
      },
      token: {
        type: 'string',
        description: 'Trello API token (automatically provided by Claude.app from your stored credentials)'
      },
      boardId: {
        type: 'string',
        description: 'ID or URL of the board (e.g. "abc123" or "https://trello.com/b/abc123/board-name")'
      },
      includeDetails: {
        type: 'boolean',
        description: 'Include all cards in the response. Default: false. WARNING: produces very large responses on busy boards. Prefer fetching board without details first, then use trello_get_list_cards or get_card for specific data.',
        default: false
      },
      descriptionMaxLength: {
        type: 'number',
        minimum: 0,
        maximum: 10000,
        description: 'Maximum length for card descriptions when includeDetails=true (0 to exclude). Default: 200',
        default: 200
      },
      compact: {
        type: 'boolean',
        description: 'When includeDetails=true, return minimal card fields only (id, name, url, listId). Default: true.',
        default: true
      }
    },
    required: ['apiKey', 'token', 'boardId']
  }
};

function truncateText(text: string | undefined | null, maxLength: number): string {
  if (!text) return '';
  if (maxLength === 0) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export async function handleGetBoardDetails(args: unknown) {
  try {
    const { apiKey, token, boardId, includeDetails, descriptionMaxLength, compact } = validateGetBoard(args);
    const client = new TrelloClient({ apiKey, token });

    const maxDescLen = descriptionMaxLength ?? 200;
    const useCompact = compact ?? true;

    const response = await client.getBoard(boardId, includeDetails);
    const board = response.data;

    const result = {
      summary: `Board: ${board.name}`,
      board: {
        id: board.id,
        name: board.name,
        description: truncateText(board.desc, maxDescLen) || 'No description',
        url: board.shortUrl,
        lastActivity: board.dateLastActivity,
        closed: board.closed,
        permissions: board.prefs?.permissionLevel || 'unknown',
        lists: board.lists?.map(list => ({
          id: list.id,
          name: list.name
        })) || [],
        ...(includeDetails && {
          cards: useCompact
            ? board.cards?.map(card => ({
                id: card.id,
                name: card.name,
                url: card.shortUrl,
                listId: card.idList
              })) || []
            : board.cards?.map(card => ({
                id: card.id,
                name: card.name,
                description: truncateText(card.desc, maxDescLen),
                url: card.shortUrl,
                listId: card.idList,
                position: card.pos,
                due: card.due,
                closed: card.closed,
                labels: card.labels?.map(label => ({
                  id: label.id,
                  name: label.name,
                  color: label.color
                })) || []
              })) || []
        })
      },
      rateLimit: response.rateLimit
    };
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof z.ZodError 
      ? formatValidationError(error)
      : error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
        
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting board details: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}

export const getListsTool: Tool = {
  name: 'get_lists',
  description: 'Get all lists in a specific Trello board. Use this to see the workflow columns (like "To Do", "In Progress", "Done") in a board.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: {
        type: 'string',
        description: 'Trello API key (automatically provided by Claude.app from your stored credentials)'
      },
      token: {
        type: 'string',
        description: 'Trello API token (automatically provided by Claude.app from your stored credentials)'
      },
      boardId: {
        type: 'string',
        description: 'ID or URL of the board (e.g. "abc123" or "https://trello.com/b/abc123/board-name")'
      },
      filter: {
        type: 'string',
        enum: ['all', 'open', 'closed'],
        description: 'Filter lists by status: "open" for active lists, "closed" for archived lists, "all" for both',
        default: 'open'
      }
    },
    required: ['apiKey', 'token', 'boardId']
  }
};

export async function handleGetLists(args: unknown) {
  try {
    const { apiKey, token, boardId, filter } = validateGetBoardLists(args);
    const client = new TrelloClient({ apiKey, token });
    
    const response = await client.getBoardLists(boardId, filter);
    const lists = response.data;
    
    const result = {
      summary: `Found ${lists.length} ${filter} list(s) in board`,
      boardId,
      lists: lists.map(list => ({
        id: list.id,
        name: list.name,
        position: list.pos,
        closed: list.closed,
        subscribed: list.subscribed
      })),
      rateLimit: response.rateLimit
    };
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    const errorMessage = error instanceof z.ZodError 
      ? formatValidationError(error)
      : error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
        
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error getting lists: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
}