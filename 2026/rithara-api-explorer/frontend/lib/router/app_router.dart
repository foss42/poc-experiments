import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../widgets/layout/main_layout.dart';

import '../screens/explorer_home_screen.dart';
import '../screens/api_detail_screen.dart';
import '../screens/category_view_screen.dart';
import '../screens/search_results_screen.dart';
import '../screens/contribute_api_screen.dart';
import '../screens/my_contributions_screen.dart';
import '../screens/review_queue_screen.dart';

part 'app_router.g.dart';

@riverpod
GoRouter router(Ref ref) => GoRouter(
      initialLocation: '/',
      routes: [
        ShellRoute(
          builder: (ctx, state, child) => MainLayout(child: child),
          routes: [
            GoRoute(path: '/',               builder: (c, s) => const ExplorerHomeScreen()),
            GoRoute(path: '/api/:id',        builder: (c, s) => ApiDetailScreen(id: s.pathParameters['id']!)),
            GoRoute(path: '/category/:cat',  builder: (c, s) => CategoryViewScreen(category: s.pathParameters['cat']!)),
            GoRoute(path: '/search',         builder: (c, s) => SearchResultsScreen(query: s.uri.queryParameters['q'] ?? '')),
            GoRoute(path: '/contribute',     builder: (c, s) => const ContributeApiScreen()),
            GoRoute(path: '/my-contributions',builder: (c, s) => const MyContributionsScreen()),
            GoRoute(path: '/review-queue',   builder: (c, s) => const ReviewQueueScreen()),
          ],
        ),
      ],
    );