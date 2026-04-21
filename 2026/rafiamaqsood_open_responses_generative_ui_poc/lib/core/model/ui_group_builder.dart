import '../model/ui_block.dart';
import '../model/ui_group.dart';

class UIGroupBuilder {
List<UIGroup> build(List<UIBlock> blocks) {
  if (blocks.isEmpty) return [];

  return [
    UIGroup(
      type: GroupType.singleCard,
      title: "Response",
      blocks: blocks,
    )
  ];
}
}