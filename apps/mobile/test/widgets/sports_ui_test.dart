import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tournament_mobile/models/domain.dart';
import 'package:tournament_mobile/theme/courtside_theme.dart';
import 'package:tournament_mobile/widgets/game_tile.dart';
import 'package:tournament_mobile/widgets/sports_ui.dart';

void main() {
  Widget host(Widget child) => MaterialApp(
    theme: CourtsideTheme.dark(const Color(0xFF174A7E)),
    home: Scaffold(body: child),
  );

  testWidgets('team crest uses deterministic initials without a logo', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      host(const TeamCrest(team: TeamSummary(id: '1', name: 'Karachi Kings'))),
    );
    expect(find.text('KK'), findsOneWidget);
    expect(find.byType(Image), findsNothing);
  });

  for (final GameStatus status in GameStatus.values) {
    testWidgets('renders ${status.name} game status accessibly', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(GameStatusBadge(status)));
      expect(find.byType(GameStatusBadge), findsOneWidget);
      expect(
        tester.getSemantics(find.byType(GameStatusBadge)),
        matchesSemantics(isLiveRegion: status == GameStatus.live),
      );

      await tester.pumpWidget(
        host(
          GameTile(
            GameSummary(
              id: status.name,
              scheduledAt: DateTime(2026, 7, 22, 18),
              status: status,
              homeTeam: const TeamSummary(id: 'home', name: 'Home'),
              awayTeam: const TeamSummary(id: 'away', name: 'Away'),
              homeScore: 80,
              awayScore: 75,
              version: 1,
              currentPeriod: status == GameStatus.live ? 3 : 0,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('scheduled game hides scores and live game shows scores', (
    WidgetTester tester,
  ) async {
    GameSummary game(GameStatus status) => GameSummary(
      id: 'game-1',
      scheduledAt: DateTime(2026, 7, 21, 18),
      status: status,
      homeTeam: const TeamSummary(id: 'home', name: 'Home Team'),
      awayTeam: const TeamSummary(id: 'away', name: 'Away Team'),
      homeScore: 87,
      awayScore: 82,
      version: 1,
    );

    await tester.pumpWidget(host(GameTile(game(GameStatus.scheduled))));
    expect(find.text('87'), findsNothing);
    expect(find.text('82'), findsNothing);

    await tester.pumpWidget(host(GameTile(game(GameStatus.live))));
    expect(find.text('87'), findsOneWidget);
    expect(find.text('82'), findsOneWidget);
  });

  testWidgets('final game highlights the winning team', (
    WidgetTester tester,
  ) async {
    final GameSummary game = GameSummary(
      id: 'final',
      scheduledAt: DateTime(2026, 7, 21, 18),
      status: GameStatus.finalScore,
      homeTeam: const TeamSummary(
        id: 'home',
        name: 'A Team Name That Is Deliberately Very Long',
      ),
      awayTeam: const TeamSummary(id: 'away', name: 'Visitors'),
      homeScore: 91,
      awayScore: 88,
      version: 2,
    );

    await tester.pumpWidget(
      host(SizedBox(width: 320, child: GameTile(game))),
    );
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.arrow_left_rounded), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
