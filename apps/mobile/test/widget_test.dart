import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tournament_mobile/widgets/states.dart';

void main() {
  testWidgets('renders an honest empty state', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: HonestEmptyState(
            title: 'No tournaments published',
            message: 'Published tournaments will appear here.',
          ),
        ),
      ),
    );

    expect(find.text('No tournaments published'), findsOneWidget);
    expect(
      find.text('Published tournaments will appear here.'),
      findsOneWidget,
    );
  });
}
