import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:tournament_mobile/models/domain.dart';
import 'package:tournament_mobile/theme/courtside_theme.dart';
import 'package:tournament_mobile/widgets/sports_ui.dart';

void main() {
  final List<AnnouncementSummary> announcements = <AnnouncementSummary>[
    AnnouncementSummary(
      id: 'one',
      title: 'Doors open at six',
      body: 'Arrive early for the opening ceremony.',
      createdAt: DateTime.utc(2026, 7, 22),
    ),
    AnnouncementSummary(
      id: 'two',
      title: 'Final moved to Court 2',
      body: 'Tipoff time is unchanged.',
      createdAt: DateTime.utc(2026, 7, 22, 1),
    ),
  ];

  Widget host({bool disableAnimations = false}) => MaterialApp(
    theme: CourtsideTheme.dark(const Color(0xFF174A7E)),
    home: MediaQuery(
      data: MediaQueryData(disableAnimations: disableAnimations),
      child: Scaffold(
        body: AnnouncementCarousel(announcements: announcements),
      ),
    ),
  );

  testWidgets('auto-rotates after six seconds', (WidgetTester tester) async {
    await tester.pumpWidget(host());
    expect(find.text('Doors open at six'), findsOneWidget);

    await tester.pump(const Duration(seconds: 6));
    await tester.pump(const Duration(milliseconds: 250));
    expect(find.text('Final moved to Court 2'), findsOneWidget);
  });

  testWidgets('pause control stops automatic rotation', (WidgetTester tester) async {
    await tester.pumpWidget(host());
    await tester.tap(find.byTooltip('Pause announcements'));
    await tester.pump(const Duration(seconds: 7));

    expect(find.text('Doors open at six'), findsOneWidget);
    expect(find.byTooltip('Resume announcements'), findsOneWidget);
  });

  testWidgets('reduced motion disables autoplay', (WidgetTester tester) async {
    await tester.pumpWidget(host(disableAnimations: true));
    await tester.pump(const Duration(seconds: 7));
    expect(find.text('Doors open at six'), findsOneWidget);
  });

  testWidgets('supports large text without clipping', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: CourtsideTheme.dark(const Color(0xFF174A7E)),
        home: MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(2)),
          child: Scaffold(
            body: AnnouncementCarousel(
              announcements: <AnnouncementSummary>[announcements.first],
            ),
          ),
        ),
      ),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('empty announcements render no carousel', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AnnouncementCarousel(announcements: const <AnnouncementSummary>[]),
      ),
    );
    expect(find.byType(PageView), findsNothing);
  });

  testWidgets('linked announcement opens its tournament', (
    WidgetTester tester,
  ) async {
    final GoRouter router = GoRouter(
      routes: <RouteBase>[
        GoRoute(
          path: '/',
          builder: (_, __) => Scaffold(
            body: AnnouncementCarousel(
              announcements: <AnnouncementSummary>[
                AnnouncementSummary(
                  id: 'linked',
                  tournamentId: 'tournament-7',
                  title: 'View tournament update',
                  body: 'The schedule has changed.',
                  createdAt: DateTime.utc(2026, 7, 22),
                ),
              ],
            ),
          ),
        ),
        GoRoute(
          path: '/tournaments/:id',
          builder: (_, GoRouterState state) => Scaffold(
            body: Text('Tournament ${state.pathParameters['id']}'),
          ),
        ),
      ],
    );
    await tester.pumpWidget(
      MaterialApp.router(
        theme: CourtsideTheme.dark(const Color(0xFF174A7E)),
        routerConfig: router,
      ),
    );

    await tester.tap(find.text('View tournament update'));
    await tester.pumpAndSettle();
    expect(find.text('Tournament tournament-7'), findsOneWidget);
  });
}
