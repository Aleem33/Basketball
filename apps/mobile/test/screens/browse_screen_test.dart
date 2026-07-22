import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tournament_mobile/models/domain.dart';
import 'package:tournament_mobile/providers/providers.dart';
import 'package:tournament_mobile/repositories/public_repository.dart';
import 'package:tournament_mobile/screens/browse_screen.dart';
import 'package:tournament_mobile/theme/courtside_theme.dart';

void main() {
  final GameSummary liveGame = GameSummary(
    id: 'live',
    scheduledAt: DateTime(2026, 7, 22, 18),
    status: GameStatus.live,
    homeTeam: const TeamSummary(id: 'home', name: 'Karachi Kings'),
    awayTeam: const TeamSummary(id: 'away', name: 'Lahore Lions'),
    homeScore: 71,
    awayScore: 69,
    version: 3,
    currentPeriod: 4,
  );

  Widget host({required Future<List<AnnouncementSummary>> announcements}) =>
      ProviderScope(
        overrides: [
          gamesProvider.overrideWith(
            (Ref ref) async =>
                CachedResult<List<GameSummary>>(<GameSummary>[liveGame], isStale: false),
          ),
          tournamentsProvider.overrideWith(
            (Ref ref) async => CachedResult<List<TournamentSummary>>(
              <TournamentSummary>[
                TournamentSummary(
                  id: 'tournament',
                  name: 'Summer Championship',
                  slug: 'summer',
                  startsAt: DateTime(2026, 7, 20),
                  endsAt: DateTime(2026, 7, 30),
                  status: 'ACTIVE',
                ),
              ],
              isStale: false,
            ),
          ),
          announcementsProvider.overrideWith((Ref ref) => announcements),
        ],
        child: MaterialApp(
          theme: CourtsideTheme.dark(const Color(0xFF174A7E)),
          home: const Scaffold(body: BrowseScreen()),
        ),
      );

  testWidgets('prioritizes announcements and live games', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      host(
        announcements: Future<List<AnnouncementSummary>>.value(
          <AnnouncementSummary>[
            AnnouncementSummary(
              id: 'announcement',
              title: 'Final moved to Court 2',
              body: 'Tipoff remains at eight.',
              createdAt: DateTime(2026, 7, 22),
            ),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Latest announcements'), findsOneWidget);
    expect(find.text('Final moved to Court 2'), findsOneWidget);
    expect(find.text('Live now'), findsOneWidget);
    expect(find.text('Karachi Kings'), findsOneWidget);
  });

  testWidgets('announcement failure does not block scores', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      host(
        announcements: Future<List<AnnouncementSummary>>.error(
          Exception('Unavailable'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Latest announcements'), findsNothing);
    expect(find.text('Karachi Kings'), findsOneWidget);
    expect(find.text('Summer Championship'), findsOneWidget);
  });
}
