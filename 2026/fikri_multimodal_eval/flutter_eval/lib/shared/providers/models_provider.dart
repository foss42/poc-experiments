import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';

typedef ModelsMap = Map<String, List<String>>;

final modelsProvider = FutureProvider<ModelsMap>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final response = await dio.get('/api/models');
    return (response.data as Map<String, dynamic>).map(
      (key, value) =>
          MapEntry(key, (value as List).map((e) => e.toString()).toList()),
    );
  } catch (_) {
    return {};
  }
});
