import 'package:flutter_test/flutter_test.dart';
import 'package:tournament_mobile/models/domain.dart';

void main() {
  test('a newer live state replaces only mutable score fields', () {
    final GameSummary original = GameSummary(
      id: 'game',
      scheduledAt: DateTime.utc(2026),
      status: GameStatus.live,
      homeTeam: const TeamSummary(id: 'home', name: 'Home'),
      awayTeam: const TeamSummary(id: 'away', name: 'Away'),
      homeScore: 4,
      awayScore: 5,
      version: 7,
    );
    final GameSummary next = original.copyWith(
      homeScore: 7,
      version: 8,
      currentPeriod: 2,
    );
    expect(next.homeScore, 7);
    expect(next.awayScore, 5);
    expect(next.homeTeam, same(original.homeTeam));
    expect(next.version, 8);
  });
}
