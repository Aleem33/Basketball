import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tournament_mobile/api/api_client.dart';
import 'package:tournament_mobile/widgets/states.dart';

void main() {
  testWidgets('empty state is honest and accessible', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: HonestEmptyState(
          title: 'No games available',
          message: 'Games appear after publication.',
        ),
      ),
    );
    expect(find.text('No games available'), findsOneWidget);
    expect(find.textContaining('publication'), findsOneWidget);
    expect(find.byIcon(Icons.sports_basketball_outlined), findsOneWidget);
  });

  testWidgets('network failure offers a retry action', (
    WidgetTester tester,
  ) async {
    int retries = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: FailureState(
          error: const NetworkFailure('Offline'),
          onRetry: () => retries += 1,
        ),
      ),
    );
    await tester.tap(find.text('Try again'));
    expect(retries, 1);
    expect(find.text('Offline'), findsOneWidget);
  });
}
