import 'ui_block.dart';

class UIGroup {
  final String? title;
  final List<UIBlock> blocks;
  final GroupType type;

  UIGroup({
    this.title,
    required this.blocks,
    this.type = GroupType.singleCard,
  });
}

enum GroupType {
  singleCard,
  multiCard,
  table,
}