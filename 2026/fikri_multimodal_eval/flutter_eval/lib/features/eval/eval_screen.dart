import 'package:flutter/material.dart';

import '../../shared/widgets/section_card.dart';
import 'widgets/modality_selector.dart';
import 'widgets/provider_selector.dart';

class EvalScreen extends StatelessWidget {
  const EvalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionCard(
            step: '1',
            title: 'Select modality & provider',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ModalitySelector(),
                ProviderSelector(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
