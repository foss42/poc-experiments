import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_colors.dart';
import '../models/api_item.dart';
import '../models/api_endpoint.dart';
import '../providers/api_providers.dart';
import '../providers/api_detail_providers.dart';
import '../widgets/common/app_badge.dart';
import '../widgets/common/method_badge.dart';
import '../widgets/common/rating_stars.dart';
import '../widgets/common/section_card.dart';
import '../widgets/common/info_row.dart';
import '../widgets/common/code_block.dart';

class ApiDetailScreen extends ConsumerWidget {
  final String id;

  const ApiDetailScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final api = ref.watch(apiByIdProvider(id));

    if (api == null) {
      return const Scaffold(
        body: Center(
          child: Text('API not found', style: TextStyle(color: Colors.white)),
        ),
      );
    }

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        body: Column(
          children: [
            _buildHeader(context, api, ref),
            TabBar(
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              labelColor: AppColors.blueLight,
              unselectedLabelColor: AppColors.textGray500,
              indicatorColor: AppColors.blueLight,
              indicatorWeight: 3,
              indicatorSize: TabBarIndicatorSize.label,
              tabs: const [
                Tab(text: 'Overview'),
                Tab(text: 'Endpoints'),
                Tab(text: 'Reviews'),
              ],
            ),
            Expanded(
              child: TabBarView(
                children: [
                  _OverviewTab(api: api),
                  _EndpointsTab(api: api),
                  _ReviewsTab(api: api),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleImport(BuildContext context, ApiItem api) {
    final Map<String, dynamic> importData = {
      'id': api.id,
      'name': api.name,
      'provider': api.provider,
      'base_url': api.baseUrl,
      'auth_type': api.authType,
      'version': api.version,
    };

    importData.removeWhere((key, value) => value == null || value == '');

    final String jsonImport = const JsonEncoder.withIndent('  ').convert(importData);

    Clipboard.setData(ClipboardData(text: jsonImport)).then((_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Copied ${api.name} import template to clipboard'),
            behavior: SnackBarBehavior.floating,
            width: 320,
            backgroundColor: AppColors.sidebarBg,
            action: SnackBarAction(label: 'OK', onPressed: () {}),
          ),
        );
      }
    });
  }

  Widget _buildHeader(BuildContext context, ApiItem api, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: AppColors.sidebarBg,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.arrow_back, color: AppColors.textGray400),
                onPressed: () {
                  if (context.canPop()) {
                    context.pop();
                  } else {
                    context.go('/');
                  }
                },
              ),
              const SizedBox(width: 8),
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppColors.blueFaint,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Hero(
                  tag: 'api-icon-${api.id}',
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: (api.icon.startsWith('http'))
                      ? Image.network(api.icon, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.api, color: AppColors.blueLight))
                      : const Icon(Icons.api, color: AppColors.blueLight, size: 32),
                  ),
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          api.name,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.textWhite,
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(width: 12),
                        if (api.unofficial)
                          const AppBadge(
                            label: 'Unofficial',
                            backgroundColor: AppColors.warningFaint,
                            textColor: AppColors.warning,
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    GestureDetector(
                      onTap: () => launchUrl(Uri.parse(api.providerUrl)),
                      child: Text(
                        'by ${api.provider}',
                        style: const TextStyle(
                          color: AppColors.blueLight,
                          fontSize: 14,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 24),
              ElevatedButton.icon(
                onPressed: () => _handleImport(context, api),
                icon: const Icon(Icons.download, size: 18),
                label: const Text('Import API'),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(
            api.description,
            style: const TextStyle(color: AppColors.textGray400, fontSize: 15, height: 1.5),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              AppBadge(label: api.version, backgroundColor: AppColors.blueFaint, textColor: AppColors.blueLight),
              AppBadge(label: api.authType, backgroundColor: AppColors.cardBg, textColor: AppColors.textGray400),
              ...api.tags.map((tag) => AppBadge(label: tag)),
            ],
          ),
        ],
      ),
    );
  }
}

class _OverviewTab extends StatelessWidget {
  final ApiItem api;
  const _OverviewTab({required this.api});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          SectionCard(
            title: 'API Information',
            child: GridView.count(
              crossAxisCount: MediaQuery.of(context).size.width > 800 ? 2 : 1,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 3.2,
              children: [
                InfoRow(icon: Icons.link, label: 'Base URL', value: api.baseUrl, copyable: true),
                InfoRow(icon: Icons.description, label: 'Documentation', value: 'View Docs', onTap: () => launchUrl(Uri.parse(api.documentation))),
                InfoRow(icon: Icons.history, label: 'Last Updated', value: api.updated),
                InfoRow(icon: Icons.calendar_today, label: 'Added Date', value: api.added),
                if (api.githubUrl != null)
                  InfoRow(icon: Icons.code, label: 'GitHub Repository', value: 'GitHub', onTap: () => launchUrl(Uri.parse(api.githubUrl!))),
                if (api.license != null)
                  InfoRow(icon: Icons.balance, label: 'License', value: api.license!.name, onTap: () => launchUrl(Uri.parse(api.license!.url))),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SectionCard(
            title: 'Description',
            child: Text(
              api.longDescription,
              style: const TextStyle(color: AppColors.textGray300, fontSize: 14, height: 1.6),
            ),
          ),
        ],
      ),
    );
  }
}

class _EndpointsTab extends ConsumerWidget {
  final ApiItem api;
  const _EndpointsTab({required this.api});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (api.templateFile == null || api.templateFile!.isEmpty) {
      if (api.endpoints.isEmpty) {
        return const Center(child: Text('No endpoints documentation available', style: TextStyle(color: AppColors.textGray400)));
      }
      return _buildEndpointsList(api.endpoints, ref);
    }

    final templatesAsync = ref.watch(apiTemplatesProvider(api.templateFile!));

    return templatesAsync.when(
      data: (data) {
        if (data['endpoints'] == null) {
          return const Center(child: Text('Error: No endpoints found in templates.', style: TextStyle(color: AppColors.danger)));
        }
        final endpointsList = (data['endpoints'] as List).map((e) => ApiEndpoint.fromTemplateJson(e as Map<String, dynamic>)).toList();
        return _buildEndpointsList(endpointsList, ref);
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, stack) => Center(child: Text('Error loading endpoints: $err', style: const TextStyle(color: AppColors.danger))),
    );
  }

  Widget _buildEndpointsList(List<ApiEndpoint> endpoints, WidgetRef ref) {
    final expandedIndex = ref.watch(expandedEndpointNotifierProvider);

    return ListView.builder(
      padding: const EdgeInsets.all(24),
      itemCount: endpoints.length,
      itemBuilder: (context, index) {
        final ep = endpoints[index];
        final isExpanded = expandedIndex == index;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: AppColors.cardBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isExpanded ? AppColors.blue.withAlpha(75) : AppColors.border),
          ),
          child: Column(
            children: [
              ListTile(
                onTap: () => ref.read(expandedEndpointNotifierProvider.notifier).toggle(index),
                leading: MethodBadge(method: ep.method),
                title: Text(
                  ep.path,
                  style: const TextStyle(color: AppColors.textWhite, fontSize: 14, fontWeight: FontWeight.w600, fontFamily: 'monospace'),
                ),
                subtitle: Text(ep.description, 
                  maxLines: 1, 
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12),
                ),
                trailing: Icon(
                  isExpanded ? Icons.expand_less : Icons.expand_more,
                  color: AppColors.textGray500,
                ),
              ),
              if (isExpanded)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Divider(color: AppColors.border),
                      const SizedBox(height: 16),
                      if (ep.url != null) ...[
                        const Text('Endpoint URL', style: TextStyle(color: AppColors.textWhite, fontSize: 13, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 8),
                        Text(ep.url!, style: const TextStyle(color: AppColors.blueLight, fontSize: 12, fontFamily: 'monospace')),
                        const SizedBox(height: 16),
                      ],
                      if (ep.sampleRequest != null) ...[
                        const Text('Sample Request', style: TextStyle(color: AppColors.textWhite, fontSize: 13, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 12),
                        CodeBlock(
                          code: ep.sampleRequest!,
                          language: 'json',
                        ),
                      ] else if (api.sampleCode.containsKey(ep.method)) ...[
                         const Text('Sample Request', style: TextStyle(color: AppColors.textWhite, fontSize: 13, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 12),
                        CodeBlock(
                          code: api.sampleCode[ep.method]!,
                          language: 'json',
                        ),
                      ],
                    ],
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _ReviewsTab extends StatelessWidget {
  final ApiItem api;
  const _ReviewsTab({required this.api});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          SectionCard(
            child: Row(
              children: [
                Column(
                  children: [
                    Text(
                      api.rating.toString(),
                      style: const TextStyle(color: AppColors.textWhite, fontSize: 48, fontWeight: FontWeight.w800),
                    ),
                    RatingStars(rating: api.rating, size: 20),
                    const SizedBox(height: 8),
                    Text('${api.totalReviews} reviews', style: const TextStyle(color: AppColors.textGray500, fontSize: 13)),
                  ],
                ),
                const Spacer(),
                ElevatedButton(
                  onPressed: () {},
                  child: const Text('Write a Review'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          ...api.reviews.map((review) => Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.cardBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundColor: AppColors.blueFaint,
                      child: Text(review.author[0], style: const TextStyle(color: AppColors.blueLight, fontSize: 12)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(review.author, style: const TextStyle(color: AppColors.textWhite, fontSize: 14, fontWeight: FontWeight.w600)),
                          Text(review.date, style: const TextStyle(color: AppColors.textGray500, fontSize: 11)),
                        ],
                      ),
                    ),
                    RatingStars(rating: review.rating.toDouble()),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  review.comment,
                  style: const TextStyle(color: AppColors.textGray300, fontSize: 14, height: 1.5),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }
}
