import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../models/api_item.dart';
import '../models/api_category.dart';
import '../data/categories.dart';
import '../services/api_service.dart';

part 'api_providers.g.dart';

@riverpod
Future<List<ApiItem>> allApis(Ref ref) async {
  return ref.watch(apiServiceProvider).fetchApis();
}

@riverpod
List<ApiCategory> allCategories(Ref ref) => categories;

@riverpod
Future<List<ApiCategory>> uniqueCategories(Ref ref) async {
  final apisAsync = ref.watch(allApisProvider);
  return apisAsync.when(
    data: (apis) {
      final Set<String> uniqueTagNames = {};
      for (final api in apis) {
        uniqueTagNames.addAll(api.tags);
      }
      
      final List<ApiCategory> derivedCategories = [
        const ApiCategory(id: 'all', name: 'All APIs', icon: Icons.folder_open),
      ];

      final sortedTags = uniqueTagNames.toList()..sort();
      
      for (final tag in sortedTags) {
        if (tag.toLowerCase() == 'all') continue;
        derivedCategories.add(ApiCategory(
          id: tag,
          name: tag,
          icon: _getIconForCategory(tag),
        ));
      }
      return derivedCategories;
    },
    loading: () => [],
    error: (_, __) => [],
  );
}

IconData _getIconForCategory(String tag) {
  final t = tag.toLowerCase();
  if (t.contains('ai') || t.contains('machine')) return Icons.psychology;
  if (t.contains('finance') || t.contains('pay')) return Icons.attach_money;
  if (t.contains('weather') || t.contains('cloud')) return Icons.cloud;
  if (t.contains('social')) return Icons.share;
  if (t.contains('shop') || t.contains('commerce')) return Icons.shopping_cart;
  if (t.contains('data') || t.contains('analysis')) return Icons.bar_chart;
  if (t.contains('chat') || t.contains('comm')) return Icons.chat_bubble_outline;
  if (t.contains('media') || t.contains('video') || t.contains('audio')) return Icons.movie;
  if (t.contains('tool') || t.contains('dev')) return Icons.code;
  if (t.contains('health')) return Icons.health_and_safety;
  if (t.contains('map') || t.contains('geo')) return Icons.map;
  if (t.contains('sport')) return Icons.sports_basketball;
  if (t.contains('education')) return Icons.school;
  if (t.contains('security')) return Icons.security;
  if (t.contains('blockchain') || t.contains('crypto')) return Icons.currency_bitcoin;
  return Icons.label;
}

@riverpod
ApiItem? apiById(Ref ref, String id) {
  final apis = ref.watch(allApisProvider).asData?.value;
  if (apis == null) return null;
  
  try {
    return apis.firstWhere((api) => api.id == id);
  } catch (_) {
    return null;
  }
}

@riverpod
List<ApiItem> apisByCategory(Ref ref, String categoryId) {
  final apis = ref.watch(allApisProvider).asData?.value ?? [];
  if (categoryId == 'all') return apis;
  return apis.where((api) => api.tags.contains(categoryId)).toList();
}

@riverpod
List<ApiItem> searchResults(Ref ref, String query) {
  final apis = ref.watch(allApisProvider).asData?.value ?? [];
  if (query.isEmpty) return [];
  final q = query.toLowerCase();
  return apis.where((api) =>
      api.name.toLowerCase().contains(q) ||
      api.provider.toLowerCase().contains(q) ||
      api.tags.any((t) => t.toLowerCase().contains(q))).toList();
}

@riverpod
Future<Map<String, dynamic>> apiTemplates(Ref ref, String templatePath) {
  return ref.watch(apiServiceProvider).fetchApiTemplates(templatePath);
}