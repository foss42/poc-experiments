import 'package:flutter/material.dart';
import '../model/ui_block.dart';
import '../model/ui_group.dart';
import 'package:flutter_markdown/flutter_markdown.dart';


class UIRenderer extends StatelessWidget {
  final List<UIGroup> groups;

  const UIRenderer({super.key, required this.groups});
  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: groups.length,
      shrinkWrap: true, 
      physics: const ClampingScrollPhysics(), 
      itemBuilder: (context, index) {
        final group = groups[index];
        return _buildGroup(group);
      },
    );
  }
  Widget _buildGroup(UIGroup group) {
    return _card(
      title: group.title ?? "Details",
      color: Colors.blue,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ...group.blocks.map((b) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: _buildBlock(b),
            );
          }),
        ],
      ),
    );
  }


  Widget _buildBlock(UIBlock block) {
    switch (block.type) {
      //  TITLE
      case UIBlockType.title:
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(
            block.value ?? "",
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
        );

      //  EMAIL
      case UIBlockType.email:
        return _row(label: "Email", value: block.value, icon: Icons.email);

      //  PHONE
      case UIBlockType.phone:
        return _row(label: "Phone", value: block.value, icon: Icons.phone);

      //  WEBSITE
      case UIBlockType.link:
        return _row(label: "Website", value: block.value, icon: Icons.public);

      //  SIMPLE TEXT
      case UIBlockType.text:
        if (block.label?.toLowerCase() == "body") {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              block.value ?? "",
              style: const TextStyle(height: 1.5),
              softWrap: true,
            ),
          );
        }

        return _row(label: block.label, value: block.value);

      // ADDRESS
      case UIBlockType.address:
        return _row(
          label: "Address",
          value: block.value,
          icon: Icons.location_on,
        );
      //  MARKDOWN
      case UIBlockType.markdown:
        return MarkdownBody(data: block.value ?? "");

      // NESTED OBJECT → SECTION
      case UIBlockType.card:
        return Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                block.label ?? "",
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: Colors.blueGrey,
                ),
              ),
              const SizedBox(height: 6),
              ...?block.children?.map(_buildBlock),
            ],
          ),
        );

      // TABLE
      case UIBlockType.table:
        return _table(block);

      //  IMAGE (optional clean)
      case UIBlockType.image:
        switch (block.imageType) {
          // LOGO
          case ImageType.logo:
            return Image.network(
              block.value,
              height: 60,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return const Icon(Icons.broken_image, size: 40);
              },
            );

          // THUMBNAIL
           case ImageType.thumbnail:
            return ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.network(
                block.value,
                height: 80,
                width: 80,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return const SizedBox(
                    height: 80,
                    width: 80,
                    child: Icon(Icons.broken_image),
                  );
                },
              ),
            );
          
          // AVATAR (FIXED CIRCLE IMAGE)
          case ImageType.avatar:
            return CircleAvatar(
              radius: 80,
              backgroundImage: NetworkImage(block.value),
              onBackgroundImageError: (error, stackTrace) {},
            );
          

          //  PHOTO (FULL IMAGE)
                    case ImageType.photo:
          default:
            return ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                block.value,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return const SizedBox(
                    height: 180,
                    child: Center(child: Icon(Icons.broken_image, size: 40)),
                  );
                },
              ),
            );
        }
         
      // DEFAULT FALLBACK
      default:
        return _row(label: block.label, value: block.value);
    }
  }
  Widget _row({String? label, dynamic value, IconData? icon}) {
    final text = value?.toString() ?? "";

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (label != null)
            Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),

          const SizedBox(height: 4),

          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (icon != null)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Icon(icon, size: 18, color: Colors.blueGrey),
                ),

              if (icon != null) const SizedBox(width: 8),

              Flexible(
                child: Text(
                  text,
                  softWrap: true,
                  maxLines: null, 
                  overflow: TextOverflow.visible,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  //  CARD CONTAINER
  Widget _card({
    required String title,
    required Color color,
    required Widget child,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: Colors.white,
        boxShadow: [
          BoxShadow(color: Colors.black, blurRadius: 10),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // HEADER
          Row(
            children: [
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),

          const Divider(height: 20),

          child,
        ],
      ),
    );
  }

  //  TABLE UI
  Widget _table(UIBlock block) {
    final columns = block.columns ?? [];
    final rows = block.rows ?? [];

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 10),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          headingRowColor: WidgetStateProperty.all(Colors.blue.shade50),
          columns: columns
              .map(
                (c) => DataColumn(
                  label: Text(
                    c.toString(),
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              )
              .toList(),
          rows: rows.map((row) {
            return DataRow(
              cells: row
                  .map((cell) => DataCell(Text(cell.toString())))
                  .toList(),
            );
          }).toList(),
        ),
      ),
    );
  }
}
