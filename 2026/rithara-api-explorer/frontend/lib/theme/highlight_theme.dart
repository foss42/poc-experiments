import 'package:flutter/material.dart';

const Map<String, TextStyle> customHighlightTheme = {
  'root': TextStyle(
    color: Color(0xFFD1D5DB),
    backgroundColor: Color(0xFF050810),
  ),
  'keyword':  TextStyle(color: Color(0xFF60A5FA)),
  'built_in': TextStyle(color: Color(0xFF60A5FA)),
  'type':     TextStyle(color: Color(0xFF60A5FA)),
  'string':   TextStyle(color: Color(0xFF86EFAC)),
  'number':   TextStyle(color: Color(0xFFFBBF24)),
  'literal':  TextStyle(color: Color(0xFFFBBF24)),
  'comment':  TextStyle(color: Color(0xFF6B7280), fontStyle: FontStyle.italic),
  'tag':      TextStyle(color: Color(0xFFEF4444)),
  'name':     TextStyle(color: Color(0xFF60A5FA)),
  'attr':     TextStyle(color: Color(0xFF86EFAC)),
  'variable': TextStyle(color: Color(0xFFF97316)),
  'params':   TextStyle(color: Color(0xFFD1D5DB)),
  'function': TextStyle(color: Color(0xFFA855F7)),
  'title':    TextStyle(color: Color(0xFFA855F7)),
  'symbol':   TextStyle(color: Color(0xFFFBBF24)),
  'meta':     TextStyle(color: Color(0xFF6B7280)),
  'addition': TextStyle(color: Color(0xFF86EFAC), backgroundColor: Color(0x1A22C55E)),
  'deletion': TextStyle(color: Color(0xFFEF4444), backgroundColor: Color(0x1AEF4444)),
};