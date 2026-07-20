import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';

class FavoritesState {
  const FavoritesState({
    this.teamIds = const <String>{},
    this.tournamentIds = const <String>{},
    this.isOffline = false,
  });
  final Set<String> teamIds;
  final Set<String> tournamentIds;
  final bool isOffline;
}

class FavoritesRepository {
  FavoritesRepository(this._api, this._preferences);
  final ApiClient _api;
  final SharedPreferences _preferences;

  FavoritesState cached() => FavoritesState(
    teamIds: (_read('favorite_team_ids')).toSet(),
    tournamentIds: (_read('favorite_tournament_ids')).toSet(),
    isOffline: true,
  );

  Future<FavoritesState> fetch() async {
    final Map<String, Object?> data = await _api.get<Map<String, Object?>>(
      '/me/favorites',
      (Object? raw) => (raw! as Map).cast<String, Object?>(),
    );
    final Set<String> teams =
        (data['teams']! as List<Object?>)
            .map((Object? row) => (row! as Map)['id']! as String)
            .toSet();
    final Set<String> tournaments =
        (data['tournaments']! as List<Object?>)
            .map((Object? row) => (row! as Map)['id']! as String)
            .toSet();
    await _preferences.setString(
      'favorite_team_ids',
      jsonEncode(teams.toList()),
    );
    await _preferences.setString(
      'favorite_tournament_ids',
      jsonEncode(tournaments.toList()),
    );
    return FavoritesState(teamIds: teams, tournamentIds: tournaments);
  }

  Future<void> setTeam(String id, bool favorite) async {
    if (favorite) {
      await _api.put<void>(
        '/me/favorites/teams/$id',
        const <String, Object?>{},
        (Object? _) {},
      );
    } else {
      await _api.delete<void>('/me/favorites/teams/$id', (Object? _) {});
    }
    await _updateCached('favorite_team_ids', id, favorite);
  }

  Future<void> setTournament(String id, bool favorite) async {
    if (favorite) {
      await _api.put<void>(
        '/me/favorites/tournaments/$id',
        const <String, Object?>{},
        (Object? _) {},
      );
    } else {
      await _api.delete<void>('/me/favorites/tournaments/$id', (Object? _) {});
    }
    await _updateCached('favorite_tournament_ids', id, favorite);
  }

  Future<void> _updateCached(String key, String id, bool present) async {
    final Set<String> values = _read(key).toSet();
    if (present) {
      values.add(id);
    } else {
      values.remove(id);
    }
    await _preferences.setString(key, jsonEncode(values.toList()));
  }

  List<String> _read(String key) {
    final String? value = _preferences.getString(key);
    if (value == null) return <String>[];
    return (jsonDecode(value) as List<Object?>).cast<String>();
  }
}
