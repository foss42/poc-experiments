import 'dart:convert';
import 'package:flutter/material.dart';

import '../models/api_template.dart';

class ApiOverviewScreen extends StatelessWidget {
  final ApiTemplate template;

  const ApiOverviewScreen({super.key, required this.template});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.blue.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.thumb_up_alt_outlined,
                        size: 16, color: Colors.blue),
                    const SizedBox(width: 6),
                    Text('${template.communityScore.issueUpvotes} Likes',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, color: Colors.blue)),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.purple.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.purple.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.comment_outlined,
                        size: 16, color: Colors.purple),
                    const SizedBox(width: 6),
                    Text('${template.communityScore.totalComments} Comments',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, color: Colors.purple)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          if (template.communityScore.interactions.isNotEmpty) ...[
            Text('Recent Comments',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Container(
              constraints: const BoxConstraints(maxHeight: 180),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: template.communityScore.interactions.length,
                separatorBuilder: (context, idx) => const Divider(height: 1),
                itemBuilder: (context, idx) {
                  final comment = template.communityScore.interactions[idx];
                  return ListTile(
                    dense: true,
                    leading: CircleAvatar(
                      radius: 16,
                      child: Text(comment.user.isNotEmpty
                          ? comment.user[0].toUpperCase()
                          : '?'),
                    ),
                    title: Text(comment.user,
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(comment.body),
                        Row(
                          children: [
                            const Icon(Icons.thumb_up_alt_outlined,
                                size: 14, color: Colors.blue),
                            const SizedBox(width: 4),
                            Text('${comment.upvotes}'),
                            const SizedBox(width: 12),
                            Text(
                              '${comment.createdAt.year}-${comment.createdAt.month.toString().padLeft(2, '0')}-${comment.createdAt.day.toString().padLeft(2, '0')} ${comment.createdAt.hour.toString().padLeft(2, '0')}:${comment.createdAt.minute.toString().padLeft(2, '0')}',
                              style: const TextStyle(
                                  fontSize: 11, color: Colors.grey),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
          ],

          // We can put Swagger or external links here if available.
          const Divider(),
          const SizedBox(height: 16),
          Text('Global Authentication Methods',
              style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context)
                  .colorScheme
                  .primaryContainer
                  .withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                  color: Theme.of(context).colorScheme.outlineVariant),
            ),
            child: const Text(
              '💡 What is a Global Auth Method?\n'
              'A global auth method specifies the default authentication approach for the entire API. '
              'Instead of repeating the same credentials (e.g., an API Key in headers or a Bearer token) '
              'for every single endpoint request, these are configured once globally. Individual endpoints '
              'can choose to override or bypass them if they are public or require different auth.',
              style: TextStyle(height: 1.5, fontSize: 13),
            ),
          ),
          const SizedBox(height: 16),
          if (template.globalAuthMethods.isEmpty)
            const Text('No Global Auth Methods defined.',
                style: TextStyle(fontStyle: FontStyle.italic))
          else
            Expanded(
              child: ListView(
                shrinkWrap: true,
                children: template.globalAuthMethods.entries.map((e) {
                  return Card(
                    elevation: 0,
                    margin: const EdgeInsets.only(bottom: 8),
                    color:
                        Theme.of(context).colorScheme.surfaceContainerHighest,
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(e.key,
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 16)),
                          const SizedBox(height: 8),
                          SelectableText(
                            const JsonEncoder.withIndent('  ').convert(e.value),
                            style: const TextStyle(
                                fontFamily: 'monospace', fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }
}
