import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../models/domain.dart';

class CachedResult<T> {
  const CachedResult(this.value, {required this.isStale});
  final T value;
  final bool isStale;
}

class PublicRepository {
  PublicRepository(this._api, this._preferences);
  final ApiClient _api;
  final SharedPreferences _preferences;

  Future<CachedResult<List<TournamentSummary>>> tournaments({
    String? search,
  }) async {
    try {
      final List<TournamentSummary> result = await _api
          .get<List<TournamentSummary>>(
            '/public/tournaments',
            (Object? raw) {
              final Map<String, Object?> page =
                  (raw! as Map).cast<String, Object?>();
              return (page['items']! as List<Object?>)
                  .map(
                    (Object? item) => TournamentSummary.fromJson(
                      (item! as Map).cast<String, Object?>(),
                    ),
                  )
                  .toList(growable: false);
            },
            query: <String, Object?>{
              if (search != null && search.isNotEmpty) 'search': search,
            },
          );
      await _writeCache(
        'tournaments',
        result
            .map(
              (TournamentSummary item) => <String, Object?>{
                'id': item.id,
                'name': item.name,
                'slug': item.slug,
                'startsAt': item.startsAt.toIso8601String(),
                'endsAt': item.endsAt.toIso8601String(),
                'status': item.status,
              },
            )
            .toList(),
      );
      return CachedResult<List<TournamentSummary>>(result, isStale: false);
    } on NetworkFailure {
      final List<Object?>? cached = _readCache('tournaments');
      if (cached == null) rethrow;
      return CachedResult<List<TournamentSummary>>(
        cached
            .map(
              (Object? item) => TournamentSummary.fromJson(
                (item! as Map).cast<String, Object?>(),
              ),
            )
            .toList(),
        isStale: true,
      );
    }
  }

  Future<CachedResult<List<GameSummary>>> games({
    GameStatus? status,
    String? tournamentId,
  }) async {
    try {
      final List<GameSummary> result = await _api.get<List<GameSummary>>(
        '/public/games',
        (Object? raw) {
          final Map<String, Object?> page =
              (raw! as Map).cast<String, Object?>();
          return (page['items']! as List<Object?>)
              .map(
                (Object? item) => GameSummary.fromJson(
                  (item! as Map).cast<String, Object?>(),
                ),
              )
              .toList(growable: false);
        },
        query: <String, Object?>{
          if (status != null) 'status': _statusJson(status),
          if (tournamentId != null) 'tournamentId': tournamentId,
        },
      );
      await _writeCache('games', result.map(_gameJson).toList());
      return CachedResult<List<GameSummary>>(result, isStale: false);
    } on NetworkFailure {
      final List<Object?>? cached = _readCache('games');
      if (cached == null) rethrow;
      return CachedResult<List<GameSummary>>(
        cached
            .map(
              (Object? item) =>
                  GameSummary.fromJson((item! as Map).cast<String, Object?>()),
            )
            .toList(),
        isStale: true,
      );
    }
  }

  Future<List<AnnouncementSummary>> announcements({String? tournamentId}) =>
      _api.get<List<AnnouncementSummary>>(
        '/public/announcements',
        (Object? raw) {
          final Map<String, Object?> page =
              (raw! as Map).cast<String, Object?>();
          return (page['items']! as List<Object?>)
              .map(
                (Object? item) => AnnouncementSummary.fromJson(
                  (item! as Map).cast<String, Object?>(),
                ),
              )
              .toList(growable: false);
        },
        query: <String, Object?>{
          if (tournamentId != null) 'tournamentId': tournamentId,
        },
      );

  Future<Map<String, Object?>> tournament(String id) =>
      _api.get<Map<String, Object?>>(
        '/public/tournaments/$id',
        (Object? raw) => (raw! as Map).cast<String, Object?>(),
      );

  Future<Map<String, Object?>> team(String id) =>
      _api.get<Map<String, Object?>>(
        '/public/teams/$id',
        (Object? raw) => (raw! as Map).cast<String, Object?>(),
      );

  Future<Map<String, Object?>> game(String id) =>
      _api.get<Map<String, Object?>>(
        '/public/games/$id',
        (Object? raw) => (raw! as Map).cast<String, Object?>(),
      );

  Future<Map<String, Object?>> standings(String stageId) =>
      _api.get<Map<String, Object?>>(
        '/public/stages/$stageId/standings',
        (Object? raw) => (raw! as Map).cast<String, Object?>(),
      );

  Future<Map<String, Object?>> bracket(String stageId) =>
      _api.get<Map<String, Object?>>(
        '/public/stages/$stageId/bracket',
        (Object? raw) => (raw! as Map).cast<String, Object?>(),
      );

  Future<Map<String, Object?>> search(String query) =>
      _api.get<Map<String, Object?>>(
        '/public/search',
        (Object? raw) => (raw! as Map).cast<String, Object?>(),
        query: <String, Object?>{'q': query},
      );

  Future<void> _writeCache(String key, Object value) async {
    await _preferences.setString(
      'cache_$key',
      jsonEncode(<String, Object?>{
        'storedAt': DateTime.now().toUtc().toIso8601String(),
        'value': value,
      }),
    );
  }

  List<Object?>? _readCache(String key) {
    final String? encoded = _preferences.getString('cache_$key');
    if (encoded == null) return null;
    final Map<String, Object?> data =
        (jsonDecode(encoded) as Map).cast<String, Object?>();
    final DateTime storedAt = DateTime.parse(data['storedAt']! as String);
    if (DateTime.now().toUtc().difference(storedAt) >
        const Duration(hours: 24)) {
      return null;
    }
    return (data['value']! as List<Object?>);
  }

  Map<String, Object?> _gameJson(GameSummary game) => <String, Object?>{
    'id': game.id,
    'scheduledAt': game.scheduledAt.toIso8601String(),
    'status': _statusJson(game.status),
    'homeTeam': game.homeTeam == null ? null : _teamJson(game.homeTeam!),
    'awayTeam': game.awayTeam == null ? null : _teamJson(game.awayTeam!),
    'homeScore': game.homeScore,
    'awayScore': game.awayScore,
    'version': game.version,
    'currentPeriod': game.currentPeriod,
  };

  Map<String, Object?> _teamJson(TeamSummary team) => <String, Object?>{
    'id': team.id,
    'name': team.name,
    'shortName': team.shortName,
    'logoUrl': team.logoUrl,
  };

  String _statusJson(GameStatus status) => switch (status) {
    GameStatus.draft => 'DRAFT',
    GameStatus.scheduled => 'SCHEDULED',
    GameStatus.live => 'LIVE',
    GameStatus.paused => 'PAUSED',
    GameStatus.finalScore => 'FINAL',
    GameStatus.postponed => 'POSTPONED',
    GameStatus.cancelled => 'CANCELLED',
    GameStatus.abandoned => 'ABANDONED',
    GameStatus.forfeited => 'FORFEITED',
  };
}
