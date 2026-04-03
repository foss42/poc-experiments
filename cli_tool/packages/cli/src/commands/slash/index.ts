import { CommandContext } from '../types.js';

// Import all slash command handlers
import { aboutCommand }         from './about.js';
import { agentsCommand }        from './agents.js';
import { authCommand }          from './auth.js';
import { bugCommand }           from './bug.js';
import { chatCommand, resumeCommand } from './chat.js';
import { commandsReloadCommand } from './commands.js';
import { compressCommand }      from './compress.js';
import { copyCommand }          from './copy.js';
import { directoryCommand }     from './directory.js';
import { docsCommand }          from './docs.js';
import { editorCommand }        from './editor.js';
import { extensionsCommand }    from './extensions.js';
import { helpCommand }          from './help.js';
import { hooksCommand }         from './hooks.js';
import { ideCommand }           from './ide.js';
import { initCommand }          from './init.js';
import { mcpCommand }           from './mcp.js';
import { memoryCommand }        from './memory.js';
import { modelCommand }         from './model.js';
import { permissionsCommand }   from './permissions.js';
import { planCommand }          from './plan.js';
import { policiesCommand }      from './policies.js';
import { privacyCommand }       from './privacy.js';
import { restoreCommand }       from './restore.js';
import { rewindCommand }        from './rewind.js';
import { settingsCommand }      from './settings.js';
import { setupGithubCommand }   from './setup-github.js';
import { shellsCommand }        from './shells.js';
import { skillsCommand }        from './skills.js';
import { statsCommand }         from './stats.js';
import { terminalSetupCommand } from './terminal-setup.js';
import { themeCommand }         from './theme.js';
import { toolsCommand }         from './tools.js';
import { upgradeCommand }       from './upgrade.js';
import { vimCommand }           from './vim.js';
import { buildCommand }         from './build.js';
import { requestCommand }       from './request.js';
import { undoCommand }          from './undo.js';

type CommandHandler = (args: string[], ctx: CommandContext) => Promise<void>;

export const slashCommands: Record<string, CommandHandler> = {
  about:           aboutCommand,
  agents:          agentsCommand,
  auth:            authCommand,
  build:           buildCommand,
  bug:             bugCommand,
  chat:            chatCommand,
  commands:        commandsReloadCommand,
  compress:        compressCommand,
  copy:            copyCommand,
  directory:       directoryCommand,
  dir:             directoryCommand,
  docs:            docsCommand,
  editor:          editorCommand,
  extensions:      extensionsCommand,
  help:            helpCommand,
  '?':             helpCommand,
  hooks:           hooksCommand,
  ide:             ideCommand,
  init:            initCommand,
  mcp:             mcpCommand,
  memory:          memoryCommand,
  model:           modelCommand,
  permissions:     permissionsCommand,
  plan:            planCommand,
  request:         requestCommand,
  undo:            undoCommand,
  policies:        policiesCommand,
  privacy:         privacyCommand,
  restore:         restoreCommand,
  resume:          resumeCommand,
  rewind:          rewindCommand,
  settings:        settingsCommand,
  'setup-github':  setupGithubCommand,
  shells:          shellsCommand,
  bashes:          shellsCommand,
  skills:          skillsCommand,
  stats:           statsCommand,
  'terminal-setup': terminalSetupCommand,
  theme:           themeCommand,
  tools:           toolsCommand,
  upgrade:         upgradeCommand,
  vim:             vimCommand,
};
