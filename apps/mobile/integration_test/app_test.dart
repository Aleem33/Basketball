import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:tournament_mobile/app.dart';
import 'package:tournament_mobile/models/domain.dart';
import 'package:tournament_mobile/providers/providers.dart';
import 'package:tournament_mobile/repositories/public_repository.dart';
import 'package:tournament_mobile/router/app_router.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'application renders public empty states and navigates between primary destinations',
    (WidgetTester tester) async {
      appRouter.go('/');
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            tournamentsProvider.overrideWith(
              (Ref ref) async => const CachedResult<List<TournamentSummary>>(
                <TournamentSummary>[],
                isStale: false,
              ),
            ),
            gamesProvider.overrideWith(
              (Ref ref) async => const CachedResult<List<GameSummary>>(
                <GameSummary>[],
                isStale: false,
              ),
            ),
          ],
          child: const TournamentApp(),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('No tournaments published'), findsOneWidget);
      expect(find.text('No games available'), findsOneWidget);

      await tester.tap(find.text('Games').last);
      await tester.pumpAndSettle();
      expect(find.text('No published games'), findsOneWidget);
    },
  );
}
