import 'dart:math';

class EvalMath {
  /// Calculates Cosine Similarity between two text samples
  /// Higher score (closer to 1.0) means higher alignment.
  static double calculateSimilarity(String text1, String text2) {
    var v1 = _textToVector(text1);
    var v2 = _textToVector(text2);
    
    var intersection = v1.keys.where((k) => v2.containsKey(k));
    
    double dotProduct = 0;
    for (var key in intersection) {
      dotProduct += v1[key]! * v2[key]!;
    }
    
    double mag1 = sqrt(v1.values.map((v) => v * v).reduce((a, b) => a + b));
    double mag2 = sqrt(v2.values.map((v) => v * v).reduce((a, b) => a + b));
    
    if (mag1 == 0 || mag2 == 0) return 0;
    return dotProduct / (mag1 * mag2);
  }

  static Map<String, int> _textToVector(String text) {
    var words = text.toLowerCase().replaceAll(RegExp(r'[^\w\s]'), '').split(' ');
    var vector = <String, int>{};
    for (var word in words) {
      if (word.isEmpty) continue;
      vector[word] = (vector[word] ?? 0) + 1;
    }
    return vector;
  }
}