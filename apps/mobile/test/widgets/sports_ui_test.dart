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
}
