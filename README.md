# Trello MCP Server

[![npm version](https://img.shields.io/npm/v/atlassian-trello-mcp.svg)](https://www.npmjs.com/package/atlassian-trello-mcp)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> 🔀 **Active fork.** This is a maintained fork of [kocakli/Trello-Desktop-MCP](https://github.com/kocakli/Trello-Desktop-MCP) integrating contributions from across the fork ecosystem ([kevinhillinger](https://github.com/kevinhillinger/trello-mcp-server), [zonca](https://github.com/zonca/Trello-Desktop-MCP), [dbz-max](https://github.com/dbz-max/Trello-Desktop-MCP), [maks244](https://github.com/maks244/trello-mcp-readonly), [jantman](https://github.com/jantman/Trello-Desktop-MCP), [ThatIanMcShane](https://github.com/ThatIanMcShane/Trello-Desktop-MCP), [josh-argyle](https://github.com/josh-argyle/Trello-Desktop-MCP)). PRs welcome — see [Credits](#credits) for what each contributor brought in. Published on npm as [`atlassian-trello-mcp`](https://www.npmjs.com/package/atlassian-trello-mcp).

A Model Context Protocol (MCP) server for Trello that works with any MCP-compatible client -- Claude Desktop, Claude Code, Gemini CLI, and more.

Provides 46 tools covering boards, cards, lists, labels, checklists, attachments, members, custom fields, and search.

## Quick Start

### 1. Get Trello API credentials

- Visit https://trello.com/app-key
- Copy your API Key
- Click "Generate a Token" for read/write access

### 2. Install

The easiest path is `npx` — no clone, no build, just run:

```bash
npx atlassian-trello-mcp
```

Or install from source:

```bash
git clone https://github.com/agrath/Trello-Desktop-MCP.git
cd Trello-Desktop-MCP
npm install
npm run build
```

### 3. Configure your MCP client

<details>
<summary><strong>Claude Desktop</strong></summary>

Edit your config file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "atlassian-trello-mcp"],
      "env": {
        "TRELLO_API_KEY": "your-api-key",
        "TRELLO_TOKEN": "your-token"
      }
    }
  }
}
```
</details>

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add trello -- npx -y atlassian-trello-mcp
```

Set environment variables `TRELLO_API_KEY` and `TRELLO_TOKEN`, or pass credentials per-request.
</details>

<details>
<summary><strong>Gemini CLI</strong></summary>

Edit `~/.gemini/settings.json`:
```json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "atlassian-trello-mcp"],
      "env": {
        "TRELLO_API_KEY": "your-api-key",
        "TRELLO_TOKEN": "your-token"
      }
    }
  }
}
```
</details>

<details>
<summary><strong>Generic MCP client / source install</strong></summary>

The server uses stdio transport. Run with environment variables set:

```bash
TRELLO_API_KEY=your-key TRELLO_TOKEN=your-token npx atlassian-trello-mcp
# or, from a source clone:
TRELLO_API_KEY=your-key TRELLO_TOKEN=your-token node dist/index.js
```
</details>

## Credentials

Credentials can be provided two ways:

1. **Environment variables** (recommended): Set `TRELLO_API_KEY` and `TRELLO_TOKEN`
2. **Per-request**: Pass `apiKey` and `token` as tool parameters (overrides env vars)

## Available Tools (46)

### Boards & Lists
| Tool | Description |
|------|-------------|
| `list_boards` | List all accessible boards |
| `trello_get_user_boards` | Get boards with user profile info |
| `get_board_details` | Board metadata, lists, and optionally cards |
| `get_lists` | Get all lists on a board |
| `trello_filter_lists` | Filter lists by name (case-insensitive substring match) |
| `trello_create_list` | Create a new list on a board |
| `trello_get_board_members` | Get all members on a board |
| `trello_get_board_labels` | Get all labels on a board |
| `trello_get_board_cards` | Get all cards on a board (compact or full) |
| `trello_get_board_custom_fields` | Get custom field definitions |

### Cards
| Tool | Description |
|------|-------------|
| `create_card` | Create a card with name, description, due date, labels, members |
| `get_card` | Get card details |
| `update_card` | Update card properties |
| `move_card` | Move a card to a different list |
| `trello_archive_card` | Archive or unarchive a card |
| `trello_get_list_cards` | Get cards in a list (compact or full mode) |

### Comments & Activity
| Tool | Description |
|------|-------------|
| `trello_add_comment` | Add a comment to a card |
| `trello_get_card_actions` | Get card activity history and comments |

### Labels
| Tool | Description |
|------|-------------|
| `trello_create_label` | Create a label on a board |
| `trello_update_label` | Update label name or color |
| `trello_delete_label` | Delete a label |
| `trello_add_label_to_card` | Assign a label to a card |
| `trello_remove_label_from_card` | Remove a label from a card |

### Members on Cards
| Tool | Description |
|------|-------------|
| `trello_get_member` | Get member profile details |
| `trello_add_member_to_card` | Assign a member to a card |
| `trello_remove_member_from_card` | Remove a member from a card |

### Attachments
| Tool | Description |
|------|-------------|
| `trello_get_card_attachments` | List all attachments on a card |
| `trello_get_card_attachment` | Get a specific attachment |
| `trello_create_card_attachment` | Attach a URL or upload a local file |
| `trello_delete_card_attachment` | Delete an attachment |

### Checklists
| Tool | Description |
|------|-------------|
| `trello_create_checklist` | Create a checklist on a card |
| `trello_get_checklist` | Get a checklist with items |
| `trello_update_checklist` | Update checklist name or position |
| `trello_delete_checklist` | Delete a checklist |
| `trello_get_checklist_field` | Get a specific checklist field |
| `trello_update_checklist_field` | Update a specific checklist field |
| `trello_get_board_for_checklist` | Get the board a checklist belongs to |
| `trello_get_card_for_checklist` | Get the card a checklist belongs to |
| `trello_get_card_checklists` | Get all checklists on a card |

### Check Items
| Tool | Description |
|------|-------------|
| `trello_create_check_item` | Add an item to a checklist |
| `trello_get_check_items` | Get all items on a checklist |
| `trello_get_check_item` | Get a specific check item |
| `trello_update_check_item` | Update item (name, state, due date, assignee) |
| `trello_delete_check_item` | Delete a check item |

### Search
| Tool | Description |
|------|-------------|
| `trello_search` | Search across boards, cards, members, organizations |

## Configuration

### Read-only mode

Set `TRELLO_READ_ONLY=true` to disable all write operations. Only read/query tools will be available.

```json
{
  "env": {
    "TRELLO_API_KEY": "your-key",
    "TRELLO_TOKEN": "your-token",
    "TRELLO_READ_ONLY": "true"
  }
}
```

### Compact mode

Several tools support a `compact` parameter (default: `true`) that returns minimal fields to reduce response size. Set `compact: false` for full details including descriptions, labels, members, and custom fields.

Tools with compact mode: `get_board_details`, `trello_get_board_cards`, `trello_get_list_cards`, `trello_search`.

### Image attachment download

When `get_card` is called and the card has image attachments, the server downloads them and returns them as inline MCP image content blocks alongside the JSON — letting the client see card images directly. Downloads are restricted to Trello-hosted URLs (`*.trello.com`, `trello-attachments.s3.amazonaws.com`) and capped at 5 MB per image to mitigate SSRF and payload-bloat risks.

Set `TRELLO_DOWNLOAD_IMAGES=false` (or `0`/`no`/`off`) to disable entirely — the server will skip the extra `getCardAttachments` call and return text only. Default is enabled.

### Logging

Set `TRELLO_MCP_LOGGING=true` to enable file-based logging via Pino. Logs are written to `dist/logs/app.log`.

## Development

### Project structure

```
src/
  index.ts              Entry point (credential injection, tool routing)
  server.ts             MCP server factory (read-only mode support)
  tools/
    boards.ts           Board tools (list, details, lists, filter)
    cards.ts            Card tools (CRUD, archive)
    lists.ts            List tools (cards, create list, comments)
    members.ts          Member tools (user boards, member details)
    search.ts           Search tool
    advanced.ts         Labels, attachments, members on cards, custom fields
    checklists.ts       Checklist and check item tools (13 tools)
  trello/
    client.ts           TrelloClient (API calls, retry, rate limiting)
  types/
    trello.ts           TypeScript interfaces
  utils/
    validation.ts       Zod schemas, extractCredentials, extractTrelloId
    logger.ts           Pino file logger
    health.ts           Health check utility
    appInsights.ts      Telemetry (no-op)
tests/
  validation.test.ts    Validation and credential extraction tests
  trelloClient.test.ts  API client tests (mocked fetch)
  tools.test.ts         Tool handler tests (mocked client)
```

### Build & test

```bash
npm install
npm run build
npm test
npm run type-check
```

### Key patterns

- **ID resolution**: All tools accept Trello URLs, short IDs, or full 24-char hex IDs via `extractTrelloId()`
- **Credential fallback**: `extractCredentials()` checks args first, then env vars
- **Retry with backoff**: TrelloClient retries on 500/network errors (3 attempts, exponential backoff)
- **Rate limiting**: Extracts and returns `x-rate-limit-*` headers from every response
- **Validation**: Zod schemas validate all inputs before API calls

## Contributing

Pull requests are welcome and actively reviewed. This fork is maintained by an extensive Trello user, so features get real-world testing.

If you've forked the original project and built something useful, please submit a PR here rather than maintaining a separate fork -- it's easier for everyone to benefit from a single well-maintained project.

To contribute:

1. Fork this repo
2. Create a feature branch
3. Add tests for new functionality
4. Run `npm test` and `npm run build`
5. Submit a pull request with a clear description of what and why

## Credits

This project is a fork of [kocakli/Trello-Desktop-MCP](https://github.com/kocakli/Trello-Desktop-MCP). Features and ideas were incorporated from across the fork ecosystem:

- **[kocakli](https://github.com/kocakli/Trello-Desktop-MCP)** -- Original project, MCP client-agnostic rebranding, stderr logging fix
- **[kevinhillinger](https://github.com/kevinhillinger/trello-mcp-server)** -- Credential injection architecture, label deletion, card member management, card archiving, expanded TypeScript types, resources layer
- **[zonca](https://github.com/zonca/Trello-Desktop-MCP)** -- Centralized credential handling with env var fallback, label management tools, comprehensive unit tests, improved TypeScript types replacing `any`
- **[dbz-max](https://github.com/dbz-max/Trello-Desktop-MCP)** -- Custom fields support (board custom fields + card custom field items)
- **[maks244](https://github.com/maks244/trello-mcp-readonly)** -- Read-only mode concept, list filtering by name, credential stripping from telemetry logs
- **[jantman](https://github.com/jantman/Trello-Desktop-MCP)** -- Fix for numeric `pos` values rejected when sent as strings by MCP clients
- **[ThatIanMcShane](https://github.com/ThatIanMcShane/Trello-Desktop-MCP)** -- Bumped `@modelcontextprotocol/sdk` 1.0.4 → 1.29.0 to fix connection timeouts with current Claude Code releases
- **[josh-argyle](https://github.com/josh-argyle/Trello-Desktop-MCP)** -- Auto-download image attachments in `get_card` responses as inline MCP image content blocks (with allowlist + size cap added during port)

## License

MIT
