import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_highlight/flutter_highlight.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../theme/highlight_theme.dart';

class CodeBlock extends StatelessWidget {
  final String code;
  final String language;
  final bool showCopy;

  const CodeBlock({
    super.key,
    required this.code,
    required this.language,
    this.showCopy = true,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.darkBg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: Stack(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.all(16),
            child: HighlightView(
              code,
              language: language,
              theme: customHighlightTheme,
              padding: EdgeInsets.zero,
              textStyle: GoogleFonts.firaCode(
                fontSize: 13,
                height: 1.5,
              ),
            ),
          ),
          if (showCopy)
            Positioned(
              top: 8,
              right: 8,
              child: Material(
                color: Colors.transparent,
                child: IconButton(
                  icon: const Icon(Icons.content_copy, size: 16),
                  color: AppColors.textGray500,
                  tooltip: 'Copy code',
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: code));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Code copied to clipboard'),
                        behavior: SnackBarBehavior.floating,
                        width: 240,
                      ),
                    );
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }
}
