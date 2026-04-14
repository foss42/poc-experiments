import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/models/health_status.dart';

final healthProvider = FutureProvider<HealthStatus>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final response = await dio.get('/api/health');
    return HealthStatus.fromJson(response.data as Map<String, dynamic>);
  } catch (_) {
    return HealthStatus.allOffline();
  }
});
