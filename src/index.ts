#!/usr/bin/env node

// Initialize logging first - this sets up file transport and console overrides
import './utils/logger.js';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

// Read credentials from environment variables
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;

// No console output in MCP mode - only JSON-RPC on stdout!
if (!TRELLO_API_KEY || !TRELLO_TOKEN) {
  process.exit(1);
}

// Import tools with credential injection
import {
  listBoardsTool,
  getBoardDetailsTool,
  getListsTool,
  handleListBoards,
  handleGetBoardDetails,
  handleGetLists,
  trelloFilterListsTool,
  handleTrelloFilterLists
} from './tools/boards.js';

import {
  createCardTool,
  updateCardTool,
  moveCardTool,
  getCardTool,
  handleCreateCard,
  handleUpdateCard,
  handleMoveCard,
  handleGetCard,
  trelloArchiveCardTool,
  handleArchiveCard
} from './tools/cards.js';

import {
  trelloSearchTool,
  handleTrelloSearch
} from './tools/search.js';

import {
  trelloGetListCardsTool,
  handleTrelloGetListCards,
  trelloCreateListTool,
  handleTrelloCreateList,
  trelloAddCommentTool,
  handleTrelloAddComment
} from './tools/lists.js';

import {
  trelloGetUserBoardsTool,
  handleTrelloGetUserBoards,
  trelloGetMemberTool,
  handleTrelloGetMember
} from './tools/members.js';

import {
  trelloGetBoardCardsTool,
  handleTrelloGetBoardCards,
  trelloGetCardActionsTool,
  handleTrelloGetCardActions,
  trelloGetCardAttachmentsTool,
  handleTrelloGetCardAttachments,
  trelloGetCardChecklistsTool,
  handleTrelloGetCardChecklists,
  trelloGetBoardMembersTool,
  handleTrelloGetBoardMembers,
  trelloGetBoardLabelsTool,
  handleTrelloGetBoardLabels,
  trelloCreateLabelTool,
  handleTrelloCreateLabel,
  trelloUpdateLabelTool,
  handleTrelloUpdateLabel,
  trelloAddLabelToCardTool,
  handleTrelloAddLabelToCard,
  trelloRemoveLabelFromCardTool,
  handleTrelloRemoveLabelFromCard,
  trelloCreateCardAttachmentTool,
  handleTrelloCreateCardAttachment,
  trelloGetCardAttachmentTool,
  handleTrelloGetCardAttachment,
  trelloDeleteCardAttachmentTool,
  handleTrelloDeleteCardAttachment,
  trelloGetBoardCustomFieldsTool,
  handleTrelloGetBoardCustomFields,
  trelloAddMemberToCardTool,
  handleTrelloAddMemberToCard,
  trelloRemoveMemberFromCardTool,
  handleTrelloRemoveMemberFromCard,
  trelloDeleteLabelTool,
  handleTrelloDeleteLabel
} from './tools/advanced.js';

import {
  trelloCreateChecklistTool,
  handleTrelloCreateChecklist,
  trelloGetChecklistTool,
  handleTrelloGetChecklist,
  trelloUpdateChecklistTool,
  handleTrelloUpdateChecklist,
  trelloDeleteChecklistTool,
  handleTrelloDeleteChecklist,
  trelloGetChecklistFieldTool,
  handleTrelloGetChecklistField,
  trelloUpdateChecklistFieldTool,
  handleTrelloUpdateChecklistField,
  trelloGetBoardForChecklistTool,
  handleTrelloGetBoardForChecklist,
  trelloGetCardForChecklistTool,
  handleTrelloGetCardForChecklist,
  trelloGetCheckItemsTool,
  handleTrelloGetCheckItems,
  trelloCreateCheckItemTool,
  handleTrelloCreateCheckItem,
  trelloGetCheckItemTool,
  handleTrelloGetCheckItem,
  trelloDeleteCheckItemTool,
  handleTrelloDeleteCheckItem,
  trelloUpdateCheckItemTool,
  handleTrelloUpdateCheckItem
} from './tools/checklists.js';

// Create server instance
const server = new Server(
  {
    name: 'trello-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Initialize handler
server.setRequestHandler(InitializeRequestSchema, async () => {
  return {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    },
    serverInfo: {
      name: 'trello-mcp',
      version: '1.0.0'
    }
  };
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Phase 1: Essential tools
      trelloSearchTool,
      trelloGetUserBoardsTool,
      getBoardDetailsTool,
      getCardTool,
      createCardTool,
      // Phase 2: Core operations
      updateCardTool,
      moveCardTool,
      trelloAddCommentTool,
      trelloGetListCardsTool,
      trelloCreateListTool,
      // Original tools (maintained for compatibility)
      listBoardsTool,
      getListsTool,
      // Member management
      trelloGetMemberTool,
      // Phase 3: Advanced features
      trelloGetBoardCardsTool,
      trelloGetCardActionsTool,
      trelloGetCardAttachmentsTool,
      trelloCreateCardAttachmentTool,
      trelloGetCardAttachmentTool,
      trelloDeleteCardAttachmentTool,
      trelloGetCardChecklistsTool,
      trelloGetBoardMembersTool,
      trelloGetBoardLabelsTool,
      // Label management
      trelloCreateLabelTool,
      trelloUpdateLabelTool,
      trelloAddLabelToCardTool,
      trelloRemoveLabelFromCardTool,
      trelloDeleteLabelTool,
      // Member management on cards
      trelloAddMemberToCardTool,
      trelloRemoveMemberFromCardTool,
      // Custom fields
      trelloGetBoardCustomFieldsTool,
      // Card archiving
      trelloArchiveCardTool,
      // List filtering
      trelloFilterListsTool,
      // Checklist management
      trelloCreateChecklistTool,
      trelloGetChecklistTool,
      trelloUpdateChecklistTool,
      trelloDeleteChecklistTool,
      trelloGetChecklistFieldTool,
      trelloUpdateChecklistFieldTool,
      trelloGetBoardForChecklistTool,
      trelloGetCardForChecklistTool,
      trelloGetCheckItemsTool,
      trelloCreateCheckItemTool,
      trelloGetCheckItemTool,
      trelloDeleteCheckItemTool,
      trelloUpdateCheckItemTool
    ]
  };
});

// Handle tool calls with automatic credential injection
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Inject credentials into arguments
  const argsWithCredentials = {
    ...args,
    apiKey: TRELLO_API_KEY,
    token: TRELLO_TOKEN
  };

  try {
    let result;

    switch (name) {
      // Phase 1: Essential tools
      case 'trello_search':
        result = await handleTrelloSearch(argsWithCredentials);
        break;

      case 'trello_get_user_boards':
        result = await handleTrelloGetUserBoards(argsWithCredentials);
        break;

      case 'get_board_details':
        result = await handleGetBoardDetails(argsWithCredentials);
        break;

      case 'get_card':
        result = await handleGetCard(argsWithCredentials);
        break;

      case 'create_card':
        result = await handleCreateCard(argsWithCredentials);
        break;

      // Phase 2: Core operations
      case 'update_card':
        result = await handleUpdateCard(argsWithCredentials);
        break;

      case 'move_card':
        result = await handleMoveCard(argsWithCredentials);
        break;

      case 'trello_add_comment':
        result = await handleTrelloAddComment(argsWithCredentials);
        break;

      case 'trello_get_list_cards':
        result = await handleTrelloGetListCards(argsWithCredentials);
        break;

      case 'trello_create_list':
        result = await handleTrelloCreateList(argsWithCredentials);
        break;

      // Original tools (maintained for compatibility)
      case 'list_boards':
        result = await handleListBoards(argsWithCredentials);
        break;

      case 'get_lists':
        result = await handleGetLists(argsWithCredentials);
        break;

      // Member management
      case 'trello_get_member':
        result = await handleTrelloGetMember(argsWithCredentials);
        break;

      // Phase 3: Advanced features
      case 'trello_get_board_cards':
        result = await handleTrelloGetBoardCards(argsWithCredentials);
        break;

      case 'trello_get_card_actions':
        result = await handleTrelloGetCardActions(argsWithCredentials);
        break;

      case 'trello_get_card_attachments':
        result = await handleTrelloGetCardAttachments(argsWithCredentials);
        break;

      case 'trello_create_card_attachment':
        result = await handleTrelloCreateCardAttachment(argsWithCredentials);
        break;

      case 'trello_get_card_attachment':
        result = await handleTrelloGetCardAttachment(argsWithCredentials);
        break;

      case 'trello_delete_card_attachment':
        result = await handleTrelloDeleteCardAttachment(argsWithCredentials);
        break;

      case 'trello_get_card_checklists':
        result = await handleTrelloGetCardChecklists(argsWithCredentials);
        break;

      case 'trello_get_board_members':
        result = await handleTrelloGetBoardMembers(argsWithCredentials);
        break;

      case 'trello_get_board_labels':
        result = await handleTrelloGetBoardLabels(argsWithCredentials);
        break;

      // Label management
      case 'trello_create_label':
        result = await handleTrelloCreateLabel(argsWithCredentials);
        break;

      case 'trello_update_label':
        result = await handleTrelloUpdateLabel(argsWithCredentials);
        break;

      case 'trello_add_label_to_card':
        result = await handleTrelloAddLabelToCard(argsWithCredentials);
        break;

      case 'trello_remove_label_from_card':
        result = await handleTrelloRemoveLabelFromCard(argsWithCredentials);
        break;

      case 'trello_delete_label':
        result = await handleTrelloDeleteLabel(argsWithCredentials);
        break;

      // Member management on cards
      case 'trello_add_member_to_card':
        result = await handleTrelloAddMemberToCard(argsWithCredentials);
        break;

      case 'trello_remove_member_from_card':
        result = await handleTrelloRemoveMemberFromCard(argsWithCredentials);
        break;

      // Custom fields
      case 'trello_get_board_custom_fields':
        result = await handleTrelloGetBoardCustomFields(argsWithCredentials);
        break;

      // Card archiving
      case 'trello_archive_card':
        result = await handleArchiveCard(argsWithCredentials);
        break;

      // List filtering
      case 'trello_filter_lists':
        result = await handleTrelloFilterLists(argsWithCredentials);
        break;

      // Checklist management
      case 'trello_create_checklist':
        result = await handleTrelloCreateChecklist(argsWithCredentials);
        break;

      case 'trello_get_checklist':
        result = await handleTrelloGetChecklist(argsWithCredentials);
        break;

      case 'trello_update_checklist':
        result = await handleTrelloUpdateChecklist(argsWithCredentials);
        break;

      case 'trello_delete_checklist':
        result = await handleTrelloDeleteChecklist(argsWithCredentials);
        break;

      case 'trello_get_checklist_field':
        result = await handleTrelloGetChecklistField(argsWithCredentials);
        break;

      case 'trello_update_checklist_field':
        result = await handleTrelloUpdateChecklistField(argsWithCredentials);
        break;

      case 'trello_get_board_for_checklist':
        result = await handleTrelloGetBoardForChecklist(argsWithCredentials);
        break;

      case 'trello_get_card_for_checklist':
        result = await handleTrelloGetCardForChecklist(argsWithCredentials);
        break;

      case 'trello_get_check_items':
        result = await handleTrelloGetCheckItems(argsWithCredentials);
        break;

      case 'trello_create_check_item':
        result = await handleTrelloCreateCheckItem(argsWithCredentials);
        break;

      case 'trello_get_check_item':
        result = await handleTrelloGetCheckItem(argsWithCredentials);
        break;

      case 'trello_delete_check_item':
        result = await handleTrelloDeleteCheckItem(argsWithCredentials);
        break;

      case 'trello_update_check_item':
        result = await handleTrelloUpdateCheckItem(argsWithCredentials);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return result;

  } catch (error) {
    throw error;
  }
});

// List resources (empty for now)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: [] };
});

// List prompts (empty for now)
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: [] };
});

// Error handler
process.on('uncaughtException', (_error) => {
  process.exit(1);
});

process.on('unhandledRejection', (_reason) => {
  process.exit(1);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Server is running - no output needed
}

main().catch((_error) => {
  process.exit(1);
});
