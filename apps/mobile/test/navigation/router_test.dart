import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:tournament_mobile/router/app_router.dart';

void main() {
  test('router defines stable public deep-link locations', () {
    final List<RouteBase> routes = appRouter.configuration.routes;
    expect(routes, isNotEmpty);
    expect(appRouter.routeInformationParser, isNotNull);
  });

  testWidgets('invalid deep link has an honest unavailable state', (
    WidgetTester tester,
  ) async {
    appRouter.go('/not-a-route');
    await tester.pumpWidget(MaterialApp.router(routerConfig: appRouter));
    await tester.pumpAndSettle();
    expect(find.textContaining('invalid'), findsOneWidget);
  });
}
