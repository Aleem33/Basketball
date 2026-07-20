import 'package:flutter_test/flutter_test.dart';
import 'package:tournament_mobile/models/domain.dart';

void main() {
  test('parses a public game without inventing missing teams', () {
    final GameSummary game = GameSummary.fromJson(<String, Object?>{
      'id': 'game-id',
      'scheduledAt': '2026-08-01T10:00:00.000Z',
      'status': 'POSTPONED',
      'homeTeam': null,
      'awayTeam': null,
      'homeScore': 0,
      'awayScore': 0,
      'version': 3,
    });
    expect(game.status, GameStatus.postponed);
    expect(game.homeTeam, isNull);
    expect(game.awayTeam, isNull);
  });

  test('rejects an unknown server status', () {
    expect(() => gameStatusFromJson('UNKNOWN'), throwsFormatException);
  });
}
