import 'package:flutter/foundation.dart';

enum GameStatus {
  draft,
  scheduled,
  live,
  paused,
  finalScore,
  postponed,
  cancelled,
  abandoned,
  forfeited,
}

GameStatus gameStatusFromJson(String value) => switch (value) {
  'DRAFT' => GameStatus.draft,
  'SCHEDULED' => GameStatus.scheduled,
  'LIVE' => GameStatus.live,
  'PAUSED' => GameStatus.paused,
  'FINAL' => GameStatus.finalScore,
  'POSTPONED' => GameStatus.postponed,
  'CANCELLED' => GameStatus.cancelled,
  'ABANDONED' => GameStatus.abandoned,
  'FORFEITED' => GameStatus.forfeited,
  _ => throw FormatException('Unknown game status: $value'),
};

@immutable
class TournamentSummary {
  const TournamentSummary({
    required this.id,
    required this.name,
    required this.slug,
    required this.startsAt,
    required this.endsAt,
    required this.status,
  });

  factory TournamentSummary.fromJson(Map<String, Object?> json) =>
      TournamentSummary(
        id: json['id']! as String,
        name: json['name']! as String,
        slug: json['slug']! as String,
        startsAt: DateTime.parse(json['startsAt']! as String),
        endsAt: DateTime.parse(json['endsAt']! as String),
        status: json['status']! as String,
      );

  final String id;
  final String name;
  final String slug;
  final DateTime startsAt;
  final DateTime endsAt;
  final String status;
}

@immutable
class TeamSummary {
  const TeamSummary({
    required this.id,
    required this.name,
    this.shortName,
    this.logoUrl,
  });

  factory TeamSummary.fromJson(Map<String, Object?> json) => TeamSummary(
    id: json['id']! as String,
    name: json['name']! as String,
    shortName: json['shortName'] as String?,
    logoUrl: json['logoUrl'] as String?,
  );

  final String id;
  final String name;
  final String? shortName;
  final String? logoUrl;
}

@immutable
class GameSummary {
  const GameSummary({
    required this.id,
    required this.scheduledAt,
    required this.status,
    required this.homeTeam,
    required this.awayTeam,
    required this.homeScore,
    required this.awayScore,
    required this.version,
    this.currentPeriod = 0,
  });

  factory GameSummary.fromJson(Map<String, Object?> json) => GameSummary(
    id: json['id']! as String,
    scheduledAt: DateTime.parse(json['scheduledAt']! as String),
    status: gameStatusFromJson(json['status']! as String),
    homeTeam:
        json['homeTeam'] == null
            ? null
            : TeamSummary.fromJson(
              (json['homeTeam']! as Map).cast<String, Object?>(),
            ),
    awayTeam:
        json['awayTeam'] == null
            ? null
            : TeamSummary.fromJson(
              (json['awayTeam']! as Map).cast<String, Object?>(),
            ),
    homeScore: json['homeScore']! as int,
    awayScore: json['awayScore']! as int,
    version: json['version']! as int,
    currentPeriod: (json['currentPeriod'] as int?) ?? 0,
  );

  final String id;
  final DateTime scheduledAt;
  final GameStatus status;
  final TeamSummary? homeTeam;
  final TeamSummary? awayTeam;
  final int homeScore;
  final int awayScore;
  final int version;
  final int currentPeriod;

  GameSummary copyWith({
    GameStatus? status,
    int? homeScore,
    int? awayScore,
    int? version,
    int? currentPeriod,
  }) => GameSummary(
    id: id,
    scheduledAt: scheduledAt,
    status: status ?? this.status,
    homeTeam: homeTeam,
    awayTeam: awayTeam,
    homeScore: homeScore ?? this.homeScore,
    awayScore: awayScore ?? this.awayScore,
    version: version ?? this.version,
    currentPeriod: currentPeriod ?? this.currentPeriod,
  );
}

@immutable
class PageResult<T> {
  const PageResult({required this.items, this.nextCursor});
  final List<T> items;
  final String? nextCursor;
}
