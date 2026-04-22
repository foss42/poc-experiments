import 'dart:io';
import '../models/models.dart';
import '../services/storage_service.dart';
import '../utils/printer.dart';

// ---------------------------------------------------------------------------
// env sub-commands:
//   env list  (el)  — list all environments
//   env use   (eu)  — set active environment
//   env show  (es)  — show active env variables
//   env set   (eset)— set a variable in active env
// ---------------------------------------------------------------------------

Future<void> envCommand(List<String> args) async {
  if (args.isEmpty) {
    await _envList([]);
    return;
  }

  final sub = args[0];
  final rest = args.sublist(1);

  switch (sub) {
    case 'list':
      await _envList(rest);
    case 'use':
      await _envUse(rest);
    case 'show':
      await _envShow(rest);
    case 'set':
      await _envSet(rest);
    default:
      printError('Unknown env sub-command: $sub');
      print('\nAvailable: list, use, show, set');
      exit(1);
  }
}

// ---- list -------------------------------------------------------------------

Future<void> _envList(List<String> _) async {
  final storage = StorageService();
  await storage.init();

  final envs = await storage.loadEnvironments();
  final activeId = await storage.loadActiveEnvId();

  if (envs.isEmpty) {
    printInfo('No environments found.');
    printDim('Create one with: apidash env set KEY VALUE');
    exit(0);
  }

  printSection('Environments');
  printTable(
    ['', 'Name', 'Variables'],
    envs.map((e) {
      final active = e.id == activeId ? '✓' : ' ';
      return [active, e.name, '${e.variables.length}'];
    }).toList(),
  );

  exit(0);
}

// ---- use --------------------------------------------------------------------

Future<void> _envUse(List<String> args) async {
  if (args.isEmpty) {
    printError('Provide an environment name.');
    print('\nUsage: apidash env use "Env Name"');
    exit(1);
  }

  final name = args.join(' ');
  final storage = StorageService();
  await storage.init();

  final envs = await storage.loadEnvironments();
  final matches = envs.where(
      (e) => e.name.toLowerCase() == name.toLowerCase() || e.id == name);

  if (matches.isEmpty) {
    printError('Environment not found: "$name"');
    printDim('Available: ${envs.map((e) => e.name).join(', ')}');
    exit(1);
  }

  await storage.saveActiveEnvId(matches.first.id);
  printSuccess('Active environment: ${matches.first.name}');
  exit(0);
}

// ---- show -------------------------------------------------------------------

Future<void> _envShow(List<String> _) async {
  final storage = StorageService();
  await storage.init();

  final env = await storage.loadActiveEnvironment();
  if (env == null) {
    printInfo('No active environment set.');
    printDim('Use: apidash env use "Env Name"');
    exit(0);
  }

  printSection('Environment: ${env.name}');

  if (env.variables.isEmpty) {
    printDim('  (no variables)');
    exit(0);
  }

  printTable(
    ['Variable', 'Value'],
    env.variables.entries.map((e) => [e.key, e.value]).toList(),
  );

  exit(0);
}

// ---- set --------------------------------------------------------------------

Future<void> _envSet(List<String> args) async {
  if (args.length < 2) {
    printError('Usage: apidash env set <KEY> <VALUE>');
    exit(1);
  }

  final key = args[0];
  final value = args.sublist(1).join(' ');

  final storage = StorageService();
  await storage.init();

  final envs = await storage.loadEnvironments();
  final activeId = await storage.loadActiveEnvId();

  ApiEnvironment env;
  if (activeId != null) {
    final idx = envs.indexWhere((e) => e.id == activeId);
    if (idx >= 0) {
      env = envs[idx];
      env.variables[key] = value;
      envs[idx] = env;
    } else {
      env = ApiEnvironment.create(name: 'Default');
      env.variables[key] = value;
      envs.add(env);
      await storage.saveActiveEnvId(env.id);
    }
  } else {
    // No active env — create a Default one
    final existing = envs.where((e) => e.name == 'Default');
    if (existing.isNotEmpty) {
      env = existing.first;
      env.variables[key] = value;
      await storage.saveActiveEnvId(env.id);
    } else {
      env = ApiEnvironment.create(name: 'Default');
      env.variables[key] = value;
      envs.add(env);
      await storage.saveActiveEnvId(env.id);
    }
  }

  await storage.saveEnvironments(envs);
  printSuccess('Set $key = $value  (env: ${env.name})');
  exit(0);
}
