import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tournament_mobile/api/api_client.dart';
import 'package:tournament_mobile/repositories/favorites_repository.dart';

class MockApiClient extends Mock implements ApiClient {}

void main() {
  test('offline favorite cache starts empty and is explicitly stale', () async {
    SharedPreferences.setMockInitialValues(<String, Object>{});
    final SharedPreferences preferences = await SharedPreferences.getInstance();
    final FavoritesState state =
        FavoritesRepository(MockApiClient(), preferences).cached();
    expect(state.teamIds, isEmpty);
    expect(state.tournamentIds, isEmpty);
    expect(state.isOffline, isTrue);
  });
}
