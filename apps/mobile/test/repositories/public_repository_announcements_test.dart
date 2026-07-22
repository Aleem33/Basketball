import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tournament_mobile/api/api_client.dart';
import 'package:tournament_mobile/config/app_config.dart';
import 'package:tournament_mobile/models/domain.dart';
import 'package:tournament_mobile/repositories/public_repository.dart';

class _MockTokenStore extends Mock implements TokenStore {}
class _MockPreferences extends Mock implements SharedPreferences {}

class _StubApiClient extends ApiClient {
  _StubApiClient(this.response)
    : super(
        AppConfig(
          apiUrl: Uri.parse('https://example.test'),
          websocketUrl: Uri.parse('https://example.test'),
          appName: 'Test',
          primaryColor: Color(0xFF174A7E),
          supportEmail: '',
          privacyPolicyUrl: null,
          termsUrl: null,
          deepLinkScheme: 'test',
          appVersion: '1.0.0',
        ),
        _MockTokenStore(),
      );

  final Object? response;

  @override
  Future<T> get<T>(
    String path,
    T Function(Object? data) decode, {
    Map<String, Object?>? query,
  }) async => decode(response);
}

void main() {
  test('repository decodes announcement items', () async {
    final PublicRepository repository = PublicRepository(
      _StubApiClient(<String, Object?>{
        'items': <Object?>[
          <String, Object?>{
            'id': 'announcement-1',
            'tournamentId': null,
            'title': 'Welcome',
            'body': 'Doors open at six.',
            'publishAt': null,
            'createdAt': '2026-07-22T14:00:00.000Z',
          },
        ],
      }),
      _MockPreferences(),
    );

    final List<AnnouncementSummary> result = await repository.announcements();
    expect(result, hasLength(1));
    expect(result.single.title, 'Welcome');
  });

  test('repository returns an empty announcement list', () async {
    final PublicRepository repository = PublicRepository(
      _StubApiClient(<String, Object?>{'items': <Object?>[]}),
      _MockPreferences(),
    );
    expect(await repository.announcements(), isEmpty);
  });

  test('repository rejects malformed announcement collections', () async {
    final PublicRepository repository = PublicRepository(
      _StubApiClient(<String, Object?>{'items': 'not-a-list'}),
      _MockPreferences(),
    );
    expect(repository.announcements(), throwsA(anything));
  });
}
