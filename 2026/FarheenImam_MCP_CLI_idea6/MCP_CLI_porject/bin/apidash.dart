import 'dart:io';
import 'package:apidash_cli/commands/collections_command.dart';
import 'package:apidash_cli/commands/delete_command.dart';
import 'package:apidash_cli/commands/duplicate_command.dart';
import 'package:apidash_cli/commands/edit_command.dart';
import 'package:apidash_cli/commands/env_command.dart';
import 'package:apidash_cli/commands/help_command.dart';
import 'package:apidash_cli/commands/history_command.dart';
import 'package:apidash_cli/commands/mcp_command.dart';
import 'package:apidash_cli/commands/rename_command.dart';
import 'package:apidash_cli/commands/run_collection_command.dart';
import 'package:apidash_cli/commands/run_command.dart';
import 'package:apidash_cli/commands/show_command.dart';
import 'package:apidash_cli/utils/alias_resolver.dart';
import 'package:apidash_cli/utils/printer.dart';

// ---------------------------------------------------------------------------
// Entry point
// Aliases are resolved BEFORE routing so every shortcut works identically
// to its full command name.
// ---------------------------------------------------------------------------

Future<void> main(List<String> rawArgs) async {
  // No args → show help
  if (rawArgs.isEmpty) {
    helpCommand([]);
    exit(0);
  }

  // ── Step 1: resolve aliases ──────────────────────────────────────────────
  final args = AliasResolver.resolve(rawArgs);
  final command = args[0];
  final rest = args.sublist(1);

  // ── Step 2: route ────────────────────────────────────────────────────────
  switch (command) {
    // --- request lifecycle --------------------------------------------------
    case 'run':
      await runCommand(rest);

    case 'collections':
      await collectionsCommand(rest);

    case 'run-collection':
      await runCollectionCommand(rest);

    case 'show':
      await showCommand(rest);

    case 'edit':
      await editCommand(rest);

    // --- environment --------------------------------------------------------
    case 'env':
      // rest[0] is the sub-command: list | use | show | set
      await envCommand(rest);

    // --- history ------------------------------------------------------------
    case 'history':
      // rest[0] (optional) is: replay | search | save
      await historyCommand(rest);

    // --- management ---------------------------------------------------------
    case 'rename':
      await renameCommand(rest);

    case 'duplicate':
      await duplicateCommand(rest);

    case 'delete':
      await deleteCommand(rest);

    // --- MCP server ---------------------------------------------------------
    // Alias 'mcp' → 'mcp serve'; explicit 'apidash mcp serve' also routes here.
    // The alias guard in AliasResolver prevents double-expansion, so after
    // resolution command is always 'mcp' and rest[0] is 'serve' (or empty).
    case 'mcp':
      // Strip the 'serve' sub-word if present; pass remaining args to the server.
      final mcpArgs =
          rest.isNotEmpty && rest[0] == 'serve' ? rest.sublist(1) : rest;
      await mcpCommand(mcpArgs);

    // --- help ---------------------------------------------------------------
    case 'help':
      helpCommand(rest);

    default:
      printError('Unknown command: "$command"');
      print('\nRun  apidash help  (or  ad ?)  for a list of commands.');
      exit(1);
  }

  exit(0); // fallback — each command calls exit() internally
}
