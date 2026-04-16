import 'package:flutter/material.dart';

import '../models/open_responses.dart';
import 'open_responses_analytics.dart';
import 'open_responses_assertions.dart';
import 'open_responses_viewer.dart';

// Dashboard that wraps the Open Responses viewer with an Assertions tab
// (validate AI response behavior like any API test) and an Analytics tab
// (token usage, item breakdown, conversation chain info).
class OpenResponsesDashboard extends StatefulWidget {
  const OpenResponsesDashboard({super.key, required this.result});

  final OpenResponsesResult result;

  @override
  State<OpenResponsesDashboard> createState() => _OpenResponsesDashboardState();
}

class _OpenResponsesDashboardState extends State<OpenResponsesDashboard>
    with SingleTickerProviderStateMixin {
  late TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Container(
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: theme.colorScheme.outlineVariant),
            ),
          ),
          child: TabBar(
            controller: _tab,
            labelStyle: theme.textTheme.labelSmall
                ?.copyWith(fontWeight: FontWeight.w600),
            unselectedLabelStyle: theme.textTheme.labelSmall,
            indicatorSize: TabBarIndicatorSize.tab,
            tabs: const [
              Tab(
                icon: Icon(Icons.list_alt_rounded, size: 15),
                text: 'Output',
                iconMargin: EdgeInsets.only(bottom: 2),
                height: 46,
              ),
              Tab(
                icon: Icon(Icons.rule_rounded, size: 15),
                text: 'Assertions',
                iconMargin: EdgeInsets.only(bottom: 2),
                height: 46,
              ),
              Tab(
                icon: Icon(Icons.analytics_outlined, size: 15),
                text: 'Analytics',
                iconMargin: EdgeInsets.only(bottom: 2),
                height: 46,
              ),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tab,
            children: [
              OpenResponsesViewer(result: widget.result),
              OpenResponsesAssertions(result: widget.result),
              OpenResponsesAnalytics(result: widget.result),
            ],
          ),
        ),
      ],
    );
  }
}
