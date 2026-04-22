// ---------------------------------------------------------------------------
// Alias resolver
// Checked BEFORE any routing. A single map defines all shortcuts.
// Compound aliases (e.g. 'el' → 'env list') are expanded into multiple args.
// ---------------------------------------------------------------------------

const Map<String, String> _aliases = {
  'r': 'run',
  'c': 'collections',
  'rc': 'run-collection',
  's': 'show',
  'e': 'edit',
  // env sub-commands
  'el': 'env list',
  'eu': 'env use',
  'es': 'env show',
  'eset': 'env set',
  // history sub-commands
  'h': 'history',
  'hr': 'history replay',
  'hs': 'history search',
  'hsv': 'history save',
  // other
  'rn': 'rename',
  'dup': 'duplicate',
  'del': 'delete',
  'mcp': 'mcp serve',
  '?': 'help',
};

class AliasResolver {
  /// Resolve aliases in [args] and return the expanded argument list.
  ///
  /// Rules (checked in order):
  ///   1. Try two-word key first  (e.g. "history replay").
  ///   2. Try one-word key        (e.g. "h").
  ///   3. Guard: never expand if args already start with the expanded words
  ///      (prevents double-expansion when a user types the full form, e.g.
  ///      `apidash mcp serve` must not become `['mcp','serve','serve']`).
  static List<String> resolve(List<String> args) {
    if (args.isEmpty) return args;

    // ── two-word alias ────────────────────────────────────────────────────
    if (args.length >= 2) {
      final twoWord = '${args[0]} ${args[1]}';
      if (_aliases.containsKey(twoWord)) {
        return [
          ..._aliases[twoWord]!.split(' '),
          ...args.sublist(2),
        ];
      }
    }

    // ── one-word alias ────────────────────────────────────────────────────
    final oneWord = args[0];
    if (_aliases.containsKey(oneWord)) {
      final expanded = _aliases[oneWord]!.split(' ');

      // Guard: skip expansion if args already begin with the expanded words.
      // e.g. `apidash mcp serve` → expanded=['mcp','serve'], args=['mcp','serve']
      // → already expanded, return as-is to avoid ['mcp','serve','serve'].
      if (_isPrefixOf(expanded, args)) return args;

      return [...expanded, ...args.sublist(1)];
    }

    return args;
  }

  /// Returns true when every word in [prefix] matches the corresponding
  /// position in [list] (list may be longer than prefix).
  static bool _isPrefixOf(List<String> prefix, List<String> list) {
    if (prefix.length > list.length) return false;
    for (var i = 0; i < prefix.length; i++) {
      if (prefix[i] != list[i]) return false;
    }
    return true;
  }

  /// Returns printable alias table for help output.
  static List<MapEntry<String, String>> get entries =>
      _aliases.entries.toList();
}
