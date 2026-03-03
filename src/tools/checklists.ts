import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TrelloClient } from '../trello/client.js';
import { formatValidationError } from '../utils/validation.js';

// --- Validators ---

const checklistIdPattern = /^[a-f0-9]{24}$/;

const validateCreateChecklist = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    cardId: z.string().regex(checklistIdPattern, 'Invalid card ID format'),
    name: z.string().min(1, 'Checklist name is required'),
    idChecklistSource: z.string().regex(checklistIdPattern, 'Invalid source checklist ID format').optional(),
    pos: z.union([z.string(), z.number()]).optional()
  });
  return schema.parse(args);
};

const validateGetChecklist = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    checklistId: z.string().regex(checklistIdPattern, 'Invalid checklist ID format'),
    fields: z.array(z.string()).optional()
  });
  return schema.parse(args);
};

const validateUpdateChecklist = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    checklistId: z.string().regex(checklistIdPattern, 'Invalid checklist ID format'),
    name: z.string().min(1).optional(),
    pos: z.union([z.string(), z.number()]).optional()
  }).refine(data => Boolean(data.name || data.pos !== undefined), {
    message: 'At least one of name or pos must be provided',
    path: ['name']
  });
  return schema.parse(args);
};

const validateDeleteChecklist = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    checklistId: z.string().regex(checklistIdPattern, 'Invalid checklist ID format')
  });
  return schema.parse(args);
};

const validateGetChecklistField = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    checklistId: z.string().regex(checklistIdPattern, 'Invalid checklist ID format'),
    field: z.enum(['name', 'pos'], { errorMap: () => ({ message: 'Field must be "name" or "pos"' }) })
  });
  return schema.parse(args);
};

const validateUpdateChecklistField = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    checklistId: z.string().regex(checklistIdPattern, 'Invalid checklist ID format'),
    field: z.enum(['name', 'pos'], { errorMap: () => ({ message: 'Field must be "name" or "pos"' }) }),
    value: z.string().min(1, 'Value is required')
  });
  return schema.parse(args);
};

const validateChecklistIdOnly = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    checklistId: z.string().regex(checklistIdPattern, 'Invalid checklist ID format')
  });
  return schema.parse(args);
};

const validateGetCheckItems = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    checklistId: z.string().regex(checklistIdPattern, 'Invalid checklist ID format'),
    filter: z.enum(['all', 'complete', 'incomplete']).optional()
  });
  return schema.parse(args);
};

const validateCreateCheckItem = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    checklistId: z.string().regex(checklistIdPattern, 'Invalid checklist ID format'),
    name: z.string().min(1, 'Check item name is required'),
    pos: z.union([z.string(), z.number()]).optional(),
    checked: z.boolean().optional(),
    due: z.string().optional(),
    idMember: z.string().regex(checklistIdPattern, 'Invalid member ID format').optional()
  });
  return schema.parse(args);
};

const validateGetCheckItem = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    checklistId: z.string().regex(checklistIdPattern, 'Invalid checklist ID format'),
    checkItemId: z.string().regex(checklistIdPattern, 'Invalid check item ID format')
  });
  return schema.parse(args);
};

const validateDeleteCheckItem = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    checklistId: z.string().regex(checklistIdPattern, 'Invalid checklist ID format'),
    checkItemId: z.string().regex(checklistIdPattern, 'Invalid check item ID format')
  });
  return schema.parse(args);
};

const validateUpdateCheckItem = (args: unknown) => {
  const schema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
    token: z.string().min(1, 'Token is required'),
    cardId: z.string().regex(checklistIdPattern, 'Invalid card ID format'),
    checkItemId: z.string().regex(checklistIdPattern, 'Invalid check item ID format'),
    name: z.string().min(1).optional(),
    state: z.enum(['complete', 'incomplete']).optional(),
    pos: z.union([z.string(), z.number()]).optional(),
    due: z.union([z.string(), z.null()]).optional(),
    idMember: z.union([z.string().regex(checklistIdPattern), z.null()]).optional()
  }).refine(data => Boolean(data.name || data.state || data.pos !== undefined || data.due !== undefined || data.idMember !== undefined), {
    message: 'At least one update field must be provided',
    path: ['name']
  });
  return schema.parse(args);
};

// --- Error helper ---

function handleToolError(error: unknown, operation: string) {
  const errorMessage = error instanceof z.ZodError
    ? formatValidationError(error)
    : error instanceof Error
      ? error.message
      : 'Unknown error occurred';

  return {
    content: [{ type: 'text' as const, text: `Error ${operation}: ${errorMessage}` }],
    isError: true
  };
}

// --- Tool definitions ---

export const trelloCreateChecklistTool: Tool = {
  name: 'trello_create_checklist',
  description: 'Create a checklist on a card. Optionally copy items from an existing checklist.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', description: 'Trello API key (automatically provided by Claude.app from your stored credentials)' },
      token: { type: 'string', description: 'Trello API token (automatically provided by Claude.app from your stored credentials)' },
      cardId: { type: 'string', description: 'ID of the card to add the checklist to', pattern: '^[a-f0-9]{24}$' },
      name: { type: 'string', description: 'Name of the checklist', minLength: 1 },
      idChecklistSource: { type: 'string', description: 'Optional: ID of a checklist to copy items from', pattern: '^[a-f0-9]{24}$' },
      pos: { oneOf: [{ type: 'string', enum: ['top', 'bottom'] }, { type: 'number', minimum: 0 }], description: 'Position of the checklist: "top", "bottom", or a positive number' }
    },
    required: ['apiKey', 'token', 'cardId', 'name']
  }
};

export const trelloGetChecklistTool: Tool = {
  name: 'trello_get_checklist',
  description: 'Get a single checklist with its check items.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', description: 'Trello API key (automatically provided by Claude.app from your stored credentials)' },
      token: { type: 'string', description: 'Trello API token (automatically provided by Claude.app from your stored credentials)' },
      checklistId: { type: 'string', description: 'ID of the checklist', pattern: '^[a-f0-9]{24}$' },
      fields: { type: 'array', items: { type: 'string' }, description: 'Optional: specific fields to include' }
    },
    required: ['apiKey', 'token', 'checklistId']
  }
};

export const trelloUpdateChecklistTool: Tool = {
  name: 'trello_update_checklist',
  description: 'Update a checklist name or position.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', description: 'Trello API key (automatically provided by Claude.app from your stored credentials)' },
      token: { type: 'string', description: 'Trello API token (automatically provided by Claude.app from your stored credentials)' },
      checklistId: { type: 'string', description: 'ID of the checklist to update', pattern: '^[a-f0-9]{24}$' },
      name: { type: 'string', description: 'New name for the checklist' },
      pos: { oneOf: [{ type: 'string', enum: ['top', 'bottom'] }, { type: 'number', minimum: 0 }], description: 'New position' }
    },
    required: ['apiKey', 'token', 'checklistId']
  }
};

export const trelloDeleteChecklistTool: Tool = {
  name: 'trello_delete_checklist',
  description: 'Delete a checklist from a card.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', description: 'Trello API key (automatically provided by Claude.app from your stored credentials)' },
      token: { type: 'string', description: 'Trello API token (automatically provided by Claude.app from your stored credentials)' },
      checklistId: { type: 'string', description: 'ID of the checklist to delete', pattern: '^[a-f0-9]{24}$' }
    },
    required: ['apiKey', 'token', 'checklistId']
  }
};

export const trelloGetChecklistFieldTool: Tool = {
  name: 'trello_get_checklist_field',
  description: 'Get a specific field (name or pos) from a checklist.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', description: 'Trello API key (automatically provided by Claude.app from your stored credentials)' },
      token: { type: 'string', description: 'Trello API token (automatically provided by Claude.app from your stored credentials)' },
      checklistId: { type: 'string', description: 'ID of the checklist', pattern: '^[a-f0-9]{24}$' },
      field: { type: 'string', enum: ['name', 'pos'], description: 'Field to retrieve' }
    },
    required: ['apiKey', 'token', 'checklistId', 'field']
  }
};

export const trelloUpdateChecklistFieldTool: Tool = {
  name: 'trello_update_checklist_field',
  description: 'Update a specific field (name or pos) on a checklist.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', description: 'Trello API key (automatically provided by Claude.app from your stored credentials)' },
      token: { type: 'string', description: 'Trello API token (automatically provided by Claude.app from your stored credentials)' },
      checklistId: { type: 'string', description: 'ID of the checklist', pattern: '^[a-f0-9]{24}$' },
      field: { type: 'string', enum: ['name', 'pos'], description: 'Field to update' },
      value: { type: 'string', description: 'New value for the field' }
    },
    required: ['apiKey', 'token', 'checklistId', 'field', 'value']
  }
};

export const trelloGetBoardForChecklistTool: Tool = {
  name: 'trello_get_board_for_checklist',
  description: 'Get the board that a checklist belongs to.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', description: 'Trello API key (automatically provided by Claude.app from your stored credentials)' },
      token: { type: 'string', description: 'Trello API token (automatically provided by Claude.app from your stored credentials)' },
      checklistId: { type: 'string', description: 'ID of the checklist', pattern: '^[a-f0-9]{24}$' }
    },
    required: ['apiKey', 'token', 'checklistId']
  }
};

export const trelloGetCardForChecklistTool: Tool = {
  name: 'trello_get_card_for_checklist',
  description: 'Get the card that a checklist belongs to.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', description: 'Trello API key (automatically provided by Claude.app from your stored credentials)' },
      token: { type: 'string', description: 'Trello API token (automatically provided by Claude.app from your stored credentials)' },
      checklistId: { type: 'string', description: 'ID of the checklist', pattern: '^[a-f0-9]{24}$' }
    },
    required: ['apiKey', 'token', 'checklistId']
  }
};

export const trelloGetCheckItemsTool: Tool = {
  name: 'trello_get_check_items',
  description: 'Get all items on a checklist. Supports filtering by state (all, complete, incomplete).',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', description: 'Trello API key (automatically provided by Claude.app from your stored credentials)' },
      token: { type: 'string', description: 'Trello API token (automatically provided by Claude.app from your stored credentials)' },
      checklistId: { type: 'string', description: 'ID of the checklist', pattern: '^[a-f0-9]{24}$' },
      filter: { type: 'string', enum: ['all', 'complete', 'incomplete'], description: 'Filter items by state. Default: all', default: 'all' }
    },
    required: ['apiKey', 'token', 'checklistId']
  }
};

export const trelloCreateCheckItemTool: Tool = {
  name: 'trello_create_check_item',
  description: 'Add an item to a checklist. Supports due dates and member assignment.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', description: 'Trello API key (automatically provided by Claude.app from your stored credentials)' },
      token: { type: 'string', description: 'Trello API token (automatically provided by Claude.app from your stored credentials)' },
      checklistId: { type: 'string', description: 'ID of the checklist to add the item to', pattern: '^[a-f0-9]{24}$' },
      name: { type: 'string', description: 'Text of the check item', minLength: 1 },
      pos: { oneOf: [{ type: 'string', enum: ['top', 'bottom'] }, { type: 'number', minimum: 0 }], description: 'Position: "top", "bottom", or a number' },
      checked: { type: 'boolean', description: 'Whether the item should start as checked', default: false },
      due: { type: 'string', description: 'Due date in ISO 8601 format (e.g., "2024-12-31T23:59:59Z")', format: 'date-time' },
      idMember: { type: 'string', description: 'ID of the member to assign', pattern: '^[a-f0-9]{24}$' }
    },
    required: ['apiKey', 'token', 'checklistId', 'name']
  }
};

export const trelloGetCheckItemTool: Tool = {
  name: 'trello_get_check_item',
  description: 'Get a single check item from a checklist.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', description: 'Trello API key (automatically provided by Claude.app from your stored credentials)' },
      token: { type: 'string', description: 'Trello API token (automatically provided by Claude.app from your stored credentials)' },
      checklistId: { type: 'string', description: 'ID of the checklist', pattern: '^[a-f0-9]{24}$' },
      checkItemId: { type: 'string', description: 'ID of the check item', pattern: '^[a-f0-9]{24}$' }
    },
    required: ['apiKey', 'token', 'checklistId', 'checkItemId']
  }
};

export const trelloDeleteCheckItemTool: Tool = {
  name: 'trello_delete_check_item',
  description: 'Delete an item from a checklist.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', description: 'Trello API key (automatically provided by Claude.app from your stored credentials)' },
      token: { type: 'string', description: 'Trello API token (automatically provided by Claude.app from your stored credentials)' },
      checklistId: { type: 'string', description: 'ID of the checklist', pattern: '^[a-f0-9]{24}$' },
      checkItemId: { type: 'string', description: 'ID of the check item to delete', pattern: '^[a-f0-9]{24}$' }
    },
    required: ['apiKey', 'token', 'checklistId', 'checkItemId']
  }
};

export const trelloUpdateCheckItemTool: Tool = {
  name: 'trello_update_check_item',
  description: 'Update a check item on a card (name, state, position, due date, member). Use state to check/uncheck items.',
  inputSchema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', description: 'Trello API key (automatically provided by Claude.app from your stored credentials)' },
      token: { type: 'string', description: 'Trello API token (automatically provided by Claude.app from your stored credentials)' },
      cardId: { type: 'string', description: 'ID of the card the check item belongs to', pattern: '^[a-f0-9]{24}$' },
      checkItemId: { type: 'string', description: 'ID of the check item to update', pattern: '^[a-f0-9]{24}$' },
      name: { type: 'string', description: 'New name for the check item' },
      state: { type: 'string', enum: ['complete', 'incomplete'], description: 'Set to "complete" to check or "incomplete" to uncheck' },
      pos: { oneOf: [{ type: 'string', enum: ['top', 'bottom'] }, { type: 'number', minimum: 0 }], description: 'New position' },
      due: { type: ['string', 'null'], description: 'Due date (ISO 8601) or null to remove' },
      idMember: { type: ['string', 'null'], description: 'Member ID to assign or null to unassign' }
    },
    required: ['apiKey', 'token', 'cardId', 'checkItemId']
  }
};

// --- Handlers ---

export async function handleTrelloCreateChecklist(args: unknown) {
  try {
    const { apiKey, token, cardId, name, idChecklistSource, pos } = validateCreateChecklist(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.createChecklist({
      name,
      idCard: cardId,
      ...(idChecklistSource && { idChecklistSource }),
      ...(pos !== undefined && { pos })
    });
    const checklist = response.data;

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          summary: `Created checklist "${checklist.name}"`,
          checklist: {
            id: checklist.id,
            name: checklist.name,
            idBoard: checklist.idBoard,
            idCard: checklist.idCard,
            pos: checklist.pos,
            checkItems: checklist.checkItems || []
          },
          rateLimit: response.rateLimit
        }, null, 2)
      }]
    };
  } catch (error) {
    return handleToolError(error, 'creating checklist');
  }
}

export async function handleTrelloGetChecklist(args: unknown) {
  try {
    const { apiKey, token, checklistId, fields } = validateGetChecklist(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.getChecklist(checklistId, {
      ...(fields && { fields })
    });
    const checklist = response.data;

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          summary: `Checklist "${checklist.name}"`,
          checklist: {
            id: checklist.id,
            name: checklist.name,
            idBoard: checklist.idBoard,
            idCard: checklist.idCard,
            pos: checklist.pos,
            checkItems: checklist.checkItems?.map(item => ({
              id: item.id,
              name: item.name,
              state: item.state,
              pos: item.pos,
              due: item.due,
              idMember: item.idMember
            })) || []
          },
          rateLimit: response.rateLimit
        }, null, 2)
      }]
    };
  } catch (error) {
    return handleToolError(error, 'getting checklist');
  }
}

export async function handleTrelloUpdateChecklist(args: unknown) {
  try {
    const { apiKey, token, checklistId, name, pos } = validateUpdateChecklist(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.updateChecklist(checklistId, {
      ...(name && { name }),
      ...(pos !== undefined && { pos })
    });
    const checklist = response.data;

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          summary: `Updated checklist "${checklist.name}"`,
          checklist: {
            id: checklist.id,
            name: checklist.name,
            pos: checklist.pos
          },
          rateLimit: response.rateLimit
        }, null, 2)
      }]
    };
  } catch (error) {
    return handleToolError(error, 'updating checklist');
  }
}

export async function handleTrelloDeleteChecklist(args: unknown) {
  try {
    const { apiKey, token, checklistId } = validateDeleteChecklist(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.deleteChecklist(checklistId);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          summary: `Deleted checklist ${checklistId}`,
          checklistId,
          rateLimit: response.rateLimit
        }, null, 2)
      }]
    };
  } catch (error) {
    return handleToolError(error, 'deleting checklist');
  }
}

export async function handleTrelloGetChecklistField(args: unknown) {
  try {
    const { apiKey, token, checklistId, field } = validateGetChecklistField(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.getChecklistField(checklistId, field);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          summary: `Checklist ${checklistId} ${field}`,
          checklistId,
          field,
          value: response.data,
          rateLimit: response.rateLimit
        }, null, 2)
      }]
    };
  } catch (error) {
    return handleToolError(error, 'getting checklist field');
  }
}

export async function handleTrelloUpdateChecklistField(args: unknown) {
  try {
    const { apiKey, token, checklistId, field, value } = validateUpdateChecklistField(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.updateChecklistField(checklistId, field, value);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          summary: `Updated checklist ${checklistId} ${field}`,
          checklistId,
          field,
          result: response.data,
          rateLimit: response.rateLimit
        }, null, 2)
      }]
    };
  } catch (error) {
    return handleToolError(error, 'updating checklist field');
  }
}

export async function handleTrelloGetBoardForChecklist(args: unknown) {
  try {
    const { apiKey, token, checklistId } = validateChecklistIdOnly(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.getBoardForChecklist(checklistId);
    const board = response.data;

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          summary: `Board for checklist ${checklistId}: "${board.name}"`,
          board: {
            id: board.id,
            name: board.name,
            url: board.shortUrl,
            closed: board.closed
          },
          rateLimit: response.rateLimit
        }, null, 2)
      }]
    };
  } catch (error) {
    return handleToolError(error, 'getting board for checklist');
  }
}

export async function handleTrelloGetCardForChecklist(args: unknown) {
  try {
    const { apiKey, token, checklistId } = validateChecklistIdOnly(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.getCardForChecklist(checklistId);
    const cards = response.data;

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          summary: `Card(s) for checklist ${checklistId}`,
          cards: cards.map(card => ({
            id: card.id,
            name: card.name,
            url: card.shortUrl
          })),
          rateLimit: response.rateLimit
        }, null, 2)
      }]
    };
  } catch (error) {
    return handleToolError(error, 'getting card for checklist');
  }
}

export async function handleTrelloGetCheckItems(args: unknown) {
  try {
    const { apiKey, token, checklistId, filter } = validateGetCheckItems(args);
    const client = new TrelloClient({ apiKey, token });

    // Trello API supports 'all', 'complete', 'incomplete' as filter values for checkItems
    // But the /checkItems endpoint uses 'filter' param differently - we filter client-side for complete/incomplete
    const filterValue = filter || 'all';

    // The Trello API's checkItems endpoint filter param expects 'all' or 'none'
    // For state-based filtering, we fetch all and filter client-side
    const response = await client.getCheckItems(checklistId);
    let items = response.data;

    if (filterValue !== 'all') {
      items = items.filter(item => item.state === filterValue);
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          summary: `Found ${items.length} ${filterValue !== 'all' ? filterValue + ' ' : ''}check item(s)`,
          checklistId,
          filter: filterValue,
          checkItems: items.map(item => ({
            id: item.id,
            name: item.name,
            state: item.state,
            pos: item.pos,
            due: item.due,
            idMember: item.idMember
          })),
          rateLimit: response.rateLimit
        }, null, 2)
      }]
    };
  } catch (error) {
    return handleToolError(error, 'getting check items');
  }
}

export async function handleTrelloCreateCheckItem(args: unknown) {
  try {
    const { apiKey, token, checklistId, name, pos, checked, due, idMember } = validateCreateCheckItem(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.createCheckItem(checklistId, {
      name,
      ...(pos !== undefined && { pos }),
      ...(checked !== undefined && { checked }),
      ...(due && { due }),
      ...(idMember && { idMember })
    });
    const item = response.data;

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          summary: `Created check item "${item.name}"`,
          checkItem: {
            id: item.id,
            name: item.name,
            state: item.state,
            pos: item.pos,
            due: item.due,
            idMember: item.idMember
          },
          rateLimit: response.rateLimit
        }, null, 2)
      }]
    };
  } catch (error) {
    return handleToolError(error, 'creating check item');
  }
}

export async function handleTrelloGetCheckItem(args: unknown) {
  try {
    const { apiKey, token, checklistId, checkItemId } = validateGetCheckItem(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.getCheckItem(checklistId, checkItemId);
    const item = response.data;

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          summary: `Check item "${item.name}"`,
          checkItem: {
            id: item.id,
            name: item.name,
            state: item.state,
            pos: item.pos,
            due: item.due,
            idMember: item.idMember
          },
          rateLimit: response.rateLimit
        }, null, 2)
      }]
    };
  } catch (error) {
    return handleToolError(error, 'getting check item');
  }
}

export async function handleTrelloDeleteCheckItem(args: unknown) {
  try {
    const { apiKey, token, checklistId, checkItemId } = validateDeleteCheckItem(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.deleteCheckItem(checklistId, checkItemId);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          summary: `Deleted check item ${checkItemId}`,
          checklistId,
          checkItemId,
          rateLimit: response.rateLimit
        }, null, 2)
      }]
    };
  } catch (error) {
    return handleToolError(error, 'deleting check item');
  }
}

export async function handleTrelloUpdateCheckItem(args: unknown) {
  try {
    const { apiKey, token, cardId, checkItemId, name, state, pos, due, idMember } = validateUpdateCheckItem(args);
    const client = new TrelloClient({ apiKey, token });

    const response = await client.updateCheckItem(cardId, checkItemId, {
      ...(name && { name }),
      ...(state && { state }),
      ...(pos !== undefined && { pos }),
      ...(due !== undefined && { due }),
      ...(idMember !== undefined && { idMember })
    });
    const item = response.data;

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          summary: `Updated check item "${item.name}"`,
          checkItem: {
            id: item.id,
            name: item.name,
            state: item.state,
            pos: item.pos,
            due: item.due,
            idMember: item.idMember
          },
          rateLimit: response.rateLimit
        }, null, 2)
      }]
    };
  } catch (error) {
    return handleToolError(error, 'updating check item');
  }
}
