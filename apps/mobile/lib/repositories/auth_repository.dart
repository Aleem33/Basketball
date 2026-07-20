import '../api/api_client.dart';

class AuthUser {
  const AuthUser({required this.id, required this.email, required this.displayName});
  final String id;
  final String email;
  final String displayName;
}

class AuthRepository {
  AuthRepository(this._api, this._tokens);
  final ApiClient _api;
  final TokenStore _tokens;

  Future<AuthUser> login(String email, String password) async {
    final Map<String, Object?> data = await _api.post<Map<String, Object?>>(
      '/auth/login',
      <String, String>{'email': email, 'password': password},
      (Object? raw) => (raw! as Map).cast<String, Object?>(),
    );
    _tokens.setAccessToken(data['accessToken']! as String);
    await _tokens.setRefreshToken(data['refreshToken']! as String);
    final Map<String, Object?> user = (data['user']! as Map).cast<String, Object?>();
    return AuthUser(
      id: user['id']! as String,
      email: user['email']! as String,
      displayName: user['displayName']! as String,
    );
  }

  Future<void> register(String email, String password, String displayName) => _api.post<void>(
    '/auth/register',
    <String, String>{'email': email, 'password': password, 'displayName': displayName, 'timezone': DateTime.now().timeZoneName},
    (Object? _) {},
  );

  Future<void> requestPasswordReset(String email) => _api.post<void>(
    '/auth/password-reset/request', <String, String>{'email': email}, (Object? _) {},
  );

  Future<void> logout() async {
    try { await _api.post<void>('/auth/logout', const <String, Object?>{}, (Object? _) {}); }
    finally { await _tokens.clear(); }
  }

  Future<String> requestDataExport() => _api.post<String>(
    '/auth/account/export', const <String, Object?>{},
    (Object? raw) => ((raw! as Map)['requestId']! as String),
  );

  Future<String> requestAccountDeletion() => _api.post<String>(
    '/auth/account/delete', const <String, Object?>{},
    (Object? raw) => ((raw! as Map)['requestId']! as String),
  );

  Future<void> saveNotificationPreference({
    required String type,
    required bool emailEnabled,
    required bool pushEnabled,
    required bool consented,
  }) => _api.put<void>(
    '/me/notification-preferences',
    <String, Object?>{
      'type': type,
      'emailEnabled': emailEnabled,
      'pushEnabled': pushEnabled,
      'inAppEnabled': true,
      'timezone': DateTime.now().timeZoneName,
      'consented': consented,
    },
    (Object? _) {},
  );
}
