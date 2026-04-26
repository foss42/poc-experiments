import 'dart:convert';

String? extractJsonValue(String jsonBody, String dotPath) {
  try {
    dynamic data = jsonDecode(jsonBody);
    final segments = _parsePath(dotPath);

    for (final segment in segments) {
      if (data == null) return null;

      if (segment.isIndex) {
        if (data is List && segment.index! < data.length) {
          data = data[segment.index!];
        } else {
          return null;
        }
      } else {
        if (data is Map<String, dynamic> && data.containsKey(segment.key)) {
          data = data[segment.key];
        } else {
          return null;
        }
      }
    }

    if (data == null) return null;
    return data.toString();
  } catch (_) {
    return null;
  }
}

class _PathSegment {
  final String? key;
  final int? index;
  bool get isIndex => index != null;

  _PathSegment.key(this.key) : index = null;
  _PathSegment.index(this.index) : key = null;
}

List<_PathSegment> _parsePath(String path) {
  final segments = <_PathSegment>[];
  final parts = path.split('.');

  for (final part in parts) {
    final bracketIdx = part.indexOf('[');
    if (bracketIdx == -1) {
      segments.add(_PathSegment.key(part));
    } else {
      if (bracketIdx > 0) {
        segments.add(_PathSegment.key(part.substring(0, bracketIdx)));
      }
      final idxStr = part.substring(bracketIdx + 1, part.indexOf(']'));
      segments.add(_PathSegment.index(int.parse(idxStr)));
    }
  }

  return segments;
}
