/// Abstract base class for all GenUI component descriptors.
abstract class GenUIComponent {
  final String type;
  final String id;

  const GenUIComponent({required this.type, required this.id});
}
