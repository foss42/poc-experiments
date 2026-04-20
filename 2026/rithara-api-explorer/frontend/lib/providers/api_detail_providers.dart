import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'api_detail_providers.g.dart';

@riverpod
class ExpandedEndpointNotifier extends _$ExpandedEndpointNotifier {
  @override
  int? build() => null;

  void toggle(int index) => state = state == index ? null : index;
  void collapse() => state = null;
}

@riverpod
class SelectedStatusCodeNotifier extends _$SelectedStatusCodeNotifier {
  @override
  Map<int, String> build() => {};

  void set(int endpointIndex, String code) =>
      state = {...state, endpointIndex: code};
}

@riverpod
class SelectedLanguageNotifier extends _$SelectedLanguageNotifier {
  @override
  String build() => 'curl';

  void set(String lang) => state = lang;
}

@riverpod
class ImportSelectionNotifier extends _$ImportSelectionNotifier {
  @override
  Set<int> build() => {};

  void toggle(int index) {
    final s = Set<int>.from(state);
    s.contains(index) ? s.remove(index) : s.add(index);
    state = s;
  }

  void selectAll(int count) =>
      state = Set.from(List.generate(count, (i) => i));

  void clear() => state = {};
}

@riverpod
class ImportDialogNotifier extends _$ImportDialogNotifier {
  @override
  bool build() => false;

  void open()  => state = true;
  void close() => state = false;
}