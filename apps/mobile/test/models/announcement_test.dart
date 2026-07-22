import 'package:flutter_test/flutter_test.dart';
import 'package:tournament_mobile/models/domain.dart';

void main() {
  test('parses a linked announcement', () {
    final AnnouncementSummary announcement = AnnouncementSummary.fromJson(
      <String, Object?>{
        'id': 'announcement-1',
        'tournamentId': 'tournament-1',
        'title': 'Final moved to Court 2',
        'body': 'Tipoff remains at 8:00 PM.',
        'publishAt': '2026-07-22T15:00:00.000Z',
        'createdAt': '2026-07-22T14:00:00.000Z',
      },
    );

    expect(announcement.tournamentId, 'tournament-1');
    expect(announcement.title, 'Final moved to Court 2');
    expect(announcement.publishAt, DateTime.utc(2026, 7, 22, 15));
  });

  test('parses a platform announcement without optional links', () {
    final AnnouncementSummary announcement = AnnouncementSummary.fromJson(
      <String, Object?>{
        'id': 'announcement-2',
        'tournamentId': null,
        'title': 'Welcome',
        'body': 'The season is underway.',
        'publishAt': null,
        'createdAt': '2026-07-22T14:00:00.000Z',
      },
    );

    expect(announcement.tournamentId, isNull);
    expect(announcement.publishAt, isNull);
  });

  test('rejects malformed announcement payloads', () {
    expect(
      () => AnnouncementSummary.fromJson(<String, Object?>{
        'id': 'announcement-3',
        'body': 'Missing a title.',
        'createdAt': 'not-a-date',
      }),
      throwsA(anything),
    );
  });
}
