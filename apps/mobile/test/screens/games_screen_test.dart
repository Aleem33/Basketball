import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tournament_mobile/models/domain.dart';
import 'package:tournament_mobile/providers/providers.dart';
import 'package:tournament_mobile/repositories/public_repository.dart';
import 'package:tournament_mobile/screens/games_screen.dart';
import 'package:tournament_mobile/theme/courtside_theme.dart';

void main() {
  testWidgets('filters scores by live, upcoming, and final state', (
    WidgetTester tester,
  ) async {
    final DateTime now = DateTime.now();
    final List<GameSummary> games = <GameSummary>[
      _game('live', GameStatus.live, now, 'Live Home'),
      _game('upcoming', GameStatus.scheduled, now, 'Upcoming Home'),
      _game('final', GameStatus.finalScore, now, 'Final Home'),
    ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          gamesProvider.overrideWith(
            (Ref ref) async =>
                CachedResult<List<GameSummary>>(games, isStale: false),
          ),
        ],
        child: MaterialApp(
          theme: CourtsideTheme.dark(const Color(0xFF174A7E)),
          home: const GamesScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Live Home'), findsOneWidget);
    expect(find.text('Upcoming Home'), findsOneWidget);
    expect(find.text('Final Home'), findsOneWidget);

    await tester.tap(find.text('Upcoming'));
    await tester.pumpAndSettle();
    expect(find.text('Upcoming Home'), findsOneWidget);
    expect(find.text('Live Home'), findsNothing);
    expect(find.text('Final Home'), findsNothing);

    await tester.tap(find.text('Final'));
    await tester.pumpAndSettle();
    expect(find.text('Final Home'), findsOneWidget);
    expect(find.text('Upcoming Home'), findsNothing);
  });
}

GameSummary _game(
  String id,
  GameStatus status,
  DateTime scheduledAt,
  String homeName,
) => GameSummary(
  id: id,
  scheduledAt: scheduledAt,
  status: status,
  homeTeam: TeamSummary(id: '$id-home', name: homeName),
  awayTeam: TeamSummary(id: '$id-away', name: '$id Away'),
  homeScore: 80,
  awayScore: 75,
  version: 1,
  currentPeriod: status == GameStatus.live ? 4 : 0,
);
