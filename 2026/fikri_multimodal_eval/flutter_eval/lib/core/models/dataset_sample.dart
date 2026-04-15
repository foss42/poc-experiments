import 'package:image_picker/image_picker.dart';

const _sentinel = Object();

class DatasetSample {
  const DatasetSample({
    required this.image,
    required this.question,
    this.choices = const [],
    this.answer,
  });

  final XFile image;
  final String question;
  final List<String> choices;
  final String? answer;

  DatasetSample copyWith({
    XFile? image,
    String? question,
    List<String>? choices,
    Object? answer = _sentinel,
  }) {
    return DatasetSample(
      image: image ?? this.image,
      question: question ?? this.question,
      choices: choices ?? this.choices,
      answer: identical(answer, _sentinel) ? this.answer : answer as String?,
    );
  }
}
