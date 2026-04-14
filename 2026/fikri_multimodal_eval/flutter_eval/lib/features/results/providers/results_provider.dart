import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';

typedef ResultList = List<Map<String, dynamic>>;

class ResultsNotifier extends AsyncNotifier<ResultList> {
  @override
  Future<ResultList> build() => _fetch();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_fetch);
  }

  Future<ResultList> _fetch() async {
    final dio = ref.read(dioProvider);
    final response = await dio.get('/api/results');
    return (response.data as List)
        .map((e) => (e as Map).cast<String, dynamic>())
        .toList();
  }
}

final resultsProvider =
    AsyncNotifierProvider<ResultsNotifier, ResultList>(ResultsNotifier.new);
