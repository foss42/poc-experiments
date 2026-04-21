import '../model/ui_block.dart';

class JsonToUIConverter {
  static const List<String> ignoredKeys = ["_id", "uuid", "id"];

  List<UIBlock> convert(dynamic json, {bool titleUsed = false}) {
    if (json == null) return [];
    if (json is List) {
      return json.asMap().entries.map((entry) {
        final index = entry.key;
        final item = entry.value;

        if (item is Map<String, dynamic>) {
          return UIBlock(
            type: UIBlockType.card,
            label: item["name"] ?? "User ${index + 1}",
            children: convert(item),
          );
        }

        return UIBlock(type: UIBlockType.text, value: item.toString());
      }).toList();
    }

    if (json is Map<String, dynamic>) {
      final primitives = <String, dynamic>{};
      final complex = <String, dynamic>{};

      for (var entry in json.entries) {
        if (ignoredKeys.contains(entry.key.toLowerCase())) {
          continue;
        }

        if (entry.value is Map || entry.value is List) {
          complex[entry.key] = entry.value;
        } else {
          primitives[entry.key] = entry.value;
        }
      }

      List<UIBlock> finalBlocks = [];

      if (primitives.isNotEmpty) {
        final primitiveBlocks = primitives.entries
            .map((e) => _parse(e.key, e.value, titleUsed: titleUsed))
            .where((b) => b != null)
            .cast<UIBlock>()
            .toList();

        primitiveBlocks.sort((a, b) {
          int getRank(UIBlockType type) {
            if (type == UIBlockType.image) return 0;
            if (type == UIBlockType.title) return 1;
            if (type == UIBlockType.text) return 2;
            return 3;
          }

          return getRank(a.type).compareTo(getRank(b.type));
        });

        if (primitiveBlocks.isNotEmpty) {
          finalBlocks.add(
            UIBlock(
              type: UIBlockType.card,
              label: "Details",
              children: primitiveBlocks,
            ),
          );
        }
      }

      for (var entry in complex.entries) {
        final block = _parse(entry.key, entry.value);
        if (block != null) finalBlocks.add(block);
      }

      return finalBlocks;
    }

    return [];
  }

  // 🔹 MAIN PARSER
  UIBlock? _parse(String key, dynamic value, {bool titleUsed = false}) {
    final k = key.toLowerCase();

    if (ignoredKeys.contains(k)) return null;
    if (value == null) return null;

    // TITLE
    if (!titleUsed && _isTitleKey(k) && value is String) {
      return UIBlock(type: UIBlockType.title, value: value);
    }

    // EMAIL
    if (k.contains("email") && value is String) {
      return UIBlock(type: UIBlockType.email, label: "Email", value: value);
    }

    // PHONE
    if (k.contains("phone") && value is String) {
      return UIBlock(type: UIBlockType.phone, label: "Phone", value: value);
    }

    // WEBSITE
    if (k.contains("website") && value is String) {
      return UIBlock(
        type: UIBlockType.link,
        label: "Website",
        value: value.startsWith("http") ? value : "https://$value",
      );
    }

    // IMAGE
    // PRIORITY IMAGES (MAIN IMAGE)
    if (k == "logo" && value is String) {
      return UIBlock(
        type: UIBlockType.image,
        label: "Logo",
        value: value,
        imageType: ImageType.logo,
      );
    }
    if (k.contains("thumbnail") && value is String) {
      return UIBlock(
        type: UIBlockType.image,
        label: "Thumbnail",
        value: value,
        imageType: ImageType.thumbnail,
      );
    }
    if (k == "avatar" && value is String) {
      return UIBlock(
        type: UIBlockType.image,
        label: "Avatar",
        value: value,
        imageType: ImageType.avatar,
      );
    }
    if (_isImageKey(k) && value is String) {
      return UIBlock(
        type: UIBlockType.image,
        label: key,
        value: value,
        imageType: ImageType.photo,
      );
    }

    // ADDRESS
    if (k == "address" || k.contains("location")) {
      if (value is Map) {
        final parts = <String>[];

        void extract(Map map) {
          map.forEach((k, v) {
            if (v is Map) {
              extract(v);
            } else if (v != null) {
              parts.add(v.toString());
            }
          });
        }

        extract(value);

        return UIBlock(
          type: UIBlockType.address,
          label: "Address",
          value: parts.join(", "),
        );
      } else if (value is String) {
        return UIBlock(
          type: UIBlockType.address,
          label: "Location",
          value: value,
        );
      }
    }

    // LIST inside object
    if (value is List) {
      return UIBlock(
        type: UIBlockType.card,
        label: key,
        children: value.map(_parseDynamic).whereType<UIBlock>().toList(),
      );
    }

    // OBJECT
    if (value is Map) {
      return UIBlock(
        type: UIBlockType.card,
        label: key,
        children: convert(value, titleUsed: false),
      );
    }

    return UIBlock(type: UIBlockType.text, label: key, value: value.toString());
  }

  UIBlock? _parseDynamic(dynamic value) {
    if (value == null) return null;

    if (value is Map<String, dynamic>) {
      return UIBlock(type: UIBlockType.card, children: convert(value));
    }

    return UIBlock(type: UIBlockType.text, value: value.toString());
  }

  bool _isTitleKey(String key) {
    return ["name", "title", "username", "full_name"].contains(key);
  }

  bool _isImageKey(String key) {
    return key.toLowerCase() == "logo" ||
        key.toLowerCase() == "avatar" ||
        key.toLowerCase() == "photo" ||
        key.toLowerCase() == "image" ||
        key.toLowerCase() == "thumbnailurl" ||
        key.toLowerCase() == "url" && key.contains("image") ||
        key.contains("photo") ||
        key.contains("avatar") ||
        key.contains("logo") ||
        key.contains("pic");
  }
}
