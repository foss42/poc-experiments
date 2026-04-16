import 'dart:io';
import '../utils/printer.dart';

// ---------------------------------------------------------------------------
// help / ? — print command reference
// ---------------------------------------------------------------------------

void helpCommand(List<String> _) {
  printSection('apidash CLI  v0.1.0');

  print('''
  Invoked as: apidash <command> [args]  or  ad <command> [args]
''');

  printSection('Commands');
  printTable(
    ['Command', 'Alias', 'Description'],
    [
      ['run',              'r',    'Fire a named or inline request'],
      ['collections',      'c',    'List collections'],
      ['run-collection',   'rc',   'Run every request in a collection'],
      ['show',             's',    'Show request details'],
      ['edit',             'e',    'Edit a saved request'],
      ['env list',         'el',   'List environments'],
      ['env use',          'eu',   'Set the active environment'],
      ['env show',         'es',   'Show active environment variables'],
      ['env set',          'eset', 'Set a variable in active environment'],
      ['history',          'h',    'Show recent request history'],
      ['history replay',   'hr',   'Replay a history entry'],
      ['history search',   'hs',   'Search history'],
      ['history save',     'hsv',  'Save history entry as a named request'],
      ['rename',           'rn',   'Rename a request'],
      ['duplicate',        'dup',  'Duplicate a request'],
      ['delete',           'del',  'Delete a request or collection'],
      ['mcp serve',        'mcp',  'Start MCP server on stdio'],
      ['help',             '?',    'Show this help'],
    ],
  );

  printSection('Quick examples');
  print('''
  # Inline request
  ad run --url https://api.example.com/users --method GET

  # Save and name a request
  ad run --url https://api.example.com/users -m POST \\
         -H "Content-Type: application/json" -b \'{"name":"Ada"}\' \\
         --save-as "Create User" --collection "Users API"

  # Run a saved request
  ad r "Create User"

  # Environment
  ad eset BASE_URL https://api.example.com
  ad eu Production

  # History
  ad h
  ad hr a1b2c3d4
  ad hs POST

  # MCP (for Claude / AI tool use)
  ad mcp serve
''');

  printSection('Storage');
  print('  ~/.apidash_cli/');
  printKeyValue('collections.json', 'saved requests organised in collections');
  printKeyValue('environments.json', 'named variable sets');
  printKeyValue('history.json',      'request history (last 500)');
  printKeyValue('active_env.json',   'currently active environment id');
  printKeyValue('responses/',        'media response files (PDF, audio, video)');

  exit(0);
}
