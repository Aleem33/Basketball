import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tournament_mobile/app.dart';
import 'package:tournament_mobile/providers/providers.dart';
import 'package:tournament_mobile/router/app_router.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('fan app loads through the Docker API and navigates on Android', (
    WidgetTester tester,
  ) async {
    final SharedPreferences preferences =
        await SharedPreferences.getInstance();
    await preferences.clear();
    appRouter.go('/');

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(preferences),
        ],
        child: const TournamentApp(),
      ),
    );
    await tester.pumpAndSettle(const Duration(milliseconds: 250));

    expect(find.text('No games available'), findsOneWidget);
    await tester.drag(
      find.byType(CustomScrollView),
      const Offset(0, -360),
    );
    await tester.pumpAndSettle();
    expect(find.text('No tournaments published'), findsOneWidget);
    expect(find.text('Dropped possession'), findsNothing);
    expect(find.text('You’re offline'), findsNothing);

    await tester.tap(find.text('Scores').last);
    await tester.pumpAndSettle();
    expect(find.text('No published games'), findsOneWidget);
  });
}
