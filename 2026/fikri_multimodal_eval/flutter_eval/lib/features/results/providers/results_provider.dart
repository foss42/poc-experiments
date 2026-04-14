import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';

const _pageSize = 20;

class ResultsState {
  const ResultsState({
    this.items = const [],
    this.total = 0,
    this.isLoadingMore = false,
  });

  final List<Map<String, dynamic>> items;
  final int total;
  final bool isLoadingMore;

  bool get hasMore => items.length < total;

  ResultsState copyWith({
    List<Map<String, dynamic>>? items,
    int? total,
    bool? isLoadingMore,
  }) {
    return ResultsState(
      items: items ?? this.items,
      total: total ?? this.total,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }
}

class ResultsNotifier extends AsyncNotifier<ResultsState> {
  @override
  Future<ResultsState> build() => _fetchPage(offset: 0);

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _fetchPage(offset: 0));
  }

  Future<void> loadMore() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore || current.isLoadingMore) return;

    state = AsyncData(current.copyWith(isLoadingMore: true));
    final next =
        await AsyncValue.guard(() => _fetchPage(offset: current.items.length));
    next.when(
      data: (page) => state = AsyncData(ResultsState(
        items: [...current.items, ...page.items],
        total: page.total,
      )),
      loading: () {},
      error: (e, st) => state = AsyncError(e, st),
    );
  }

  Future<ResultsState> _fetchPage({required int offset}) async {
    final dio = ref.read(dioProvider);
    final response = await dio.get(
      '/api/results',
      queryParameters: {'limit': _pageSize, 'offset': offset},
    );
    final data = response.data as Map<String, dynamic>;
    final total = data['total'] as int? ?? 0;
    final items = (data['results'] as List?)
            ?.map((e) => (e as Map).cast<String, dynamic>())
            .toList() ??
        [];
    return ResultsState(items: items, total: total);
  }
}

final resultsProvider =
    AsyncNotifierProvider<ResultsNotifier, ResultsState>(ResultsNotifier.new);
