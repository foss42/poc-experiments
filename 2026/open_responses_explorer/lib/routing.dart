import 'package:flutter/material.dart';

Route<void> slideUpRoute(Widget page, {int durationMs = 320}) {
  final reverseMs = (durationMs * 0.8).round();

  // The page widget is provided by the caller; this helper only standardizes
  // transition timings and slide-up motion across screens.
  return PageRouteBuilder<void>(
    transitionDuration: Duration(milliseconds: durationMs),
    reverseTransitionDuration: Duration(milliseconds: reverseMs),
    pageBuilder:
        (
          BuildContext context,
          Animation<double> animation,
          Animation<double> secondaryAnimation,
        ) => page,
    transitionsBuilder:
        (
          BuildContext context,
          Animation<double> animation,
          Animation<double> secondaryAnimation,
          Widget child,
        ) {
          return SlideTransition(
            position: Tween<Offset>(begin: const Offset(0, 1), end: Offset.zero)
                .animate(
                  CurvedAnimation(
                    parent: animation,
                    curve: Curves.easeOutCubic,
                  ),
                ),
            child: child,
          );
        },
  );
}
