import 'dart:async';
import 'dart:math';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/app_config.dart';

sealed class AppFailure implements Exception {
  const AppFailure(this.message);
  final String message;
}

class NetworkFailure extends AppFailure {
  const NetworkFailure(super.message);
}

class AuthenticationFailure extends AppFailure {
  const AuthenticationFailure(super.message);
}

class PermissionFailure extends AppFailure {
  const PermissionFailure(super.message);
}

class UnavailableFailure extends AppFailure {
  const UnavailableFailure(super.message);
}

class MaintenanceFailure extends AppFailure {
  const MaintenanceFailure(super.message);
}

class UpgradeRequiredFailure extends AppFailure {
  const UpgradeRequiredFailure(super.message);
}

class ApiFailure extends AppFailure {
  const ApiFailure(super.message, this.code);
  final String code;
}

class TokenStore {
  TokenStore(this._storage);
  final FlutterSecureStorage _storage;
  String? _accessToken;

  String? get accessToken => _accessToken;
  void setAccessToken(String? value) => _accessToken = value;
  Future<String?> refreshToken() => _storage.read(key: 'refresh_token');
  Future<void> setRefreshToken(String value) =>
      _storage.write(key: 'refresh_token', value: value);
  Future<void> clear() async {
    _accessToken = null;
    await _storage.delete(key: 'refresh_token');
  }
}

class ApiClient {
  ApiClient(AppConfig config, this._tokens)
    : _dio = Dio(
        BaseOptions(
          baseUrl: config.apiUrl.toString(),
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 15),
          headers: <String, String>{
            'accept': 'application/json',
            'x-client-platform': 'mobile',
            'x-mobile-app-version': config.appVersion,
          },
        ),
      ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (RequestOptions options, RequestInterceptorHandler handler) {
          final String? access = _tokens.accessToken;
          if (access != null) {
            options.headers['authorization'] = 'Bearer $access';
          }
          options.headers['x-correlation-id'] = _uuid();
          handler.next(options);
        },
        onError: (DioException error, ErrorInterceptorHandler handler) async {
          if (error.response?.statusCode == 401 &&
              !error.requestOptions.path.contains('/auth/refresh')) {
            final bool restored = await _refreshOnce();
            if (restored) {
              error.requestOptions.headers['authorization'] =
                  'Bearer ${_tokens.accessToken}';
              final Response<Object?> response = await _dio.fetch<Object?>(
                error.requestOptions,
              );
              handler.resolve(response);
              return;
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  final Dio _dio;
  final TokenStore _tokens;
  Future<bool>? _refreshing;

  Future<T> get<T>(
    String path,
    T Function(Object? data) decode, {
    Map<String, Object?>? query,
  }) async {
    try {
      final Response<Object?> response = await _dio.get<Object?>(
        path,
        queryParameters: query,
      );
      return decode(_unwrap(response.data));
    } on DioException catch (error) {
      throw _mapError(error);
    }
  }

  Future<T> post<T>(
    String path,
    Object? body,
    T Function(Object? data) decode,
  ) async {
    try {
      final Response<Object?> response = await _dio.post<Object?>(
        path,
        data: body,
      );
      return decode(response.statusCode == 204 ? null : _unwrap(response.data));
    } on DioException catch (error) {
      throw _mapError(error);
    }
  }

  Future<T> put<T>(
    String path,
    Object? body,
    T Function(Object? data) decode,
  ) async {
    try {
      final Response<Object?> response = await _dio.put<Object?>(
        path,
        data: body,
      );
      return decode(response.statusCode == 204 ? null : _unwrap(response.data));
    } on DioException catch (error) {
      throw _mapError(error);
    }
  }

  Future<T> delete<T>(String path, T Function(Object? data) decode) async {
    try {
      final Response<Object?> response = await _dio.delete<Object?>(path);
      return decode(response.statusCode == 204 ? null : _unwrap(response.data));
    } on DioException catch (error) {
      throw _mapError(error);
    }
  }

  Future<bool> _refreshOnce() {
    final Future<bool>? current = _refreshing;
    if (current != null) return current;
    final Future<bool> operation = _performRefresh();
    _refreshing = operation;
    return operation.whenComplete(() => _refreshing = null);
  }

  Future<bool> _performRefresh() async {
    final String? refresh = await _tokens.refreshToken();
    if (refresh == null) return false;
    try {
      final Response<Object?> response = await _dio.post<Object?>(
        '/auth/refresh',
        data: <String, String>{'refreshToken': refresh},
      );
      final Map<String, Object?> data =
          (_unwrap(response.data)! as Map).cast<String, Object?>();
      _tokens.setAccessToken(data['accessToken']! as String);
      await _tokens.setRefreshToken(data['refreshToken']! as String);
      return true;
    } on DioException {
      await _tokens.clear();
      return false;
    }
  }

  Object? _unwrap(Object? raw) {
    if (raw is! Map) {
      throw const ApiFailure(
        'The server returned an invalid response.',
        'INVALID_RESPONSE',
      );
    }
    final Map<String, Object?> envelope = raw.cast<String, Object?>();
    if (envelope['success'] != true) {
      final Map<String, Object?> error =
          ((envelope['error'] as Map?) ?? <String, Object?>{})
              .cast<String, Object?>();
      throw ApiFailure(
        (error['message'] as String?) ?? 'Request failed.',
        (error['code'] as String?) ?? 'API_ERROR',
      );
    }
    return envelope['data'];
  }

  AppFailure _mapError(DioException error) {
    final int? status = error.response?.statusCode;
    final String message =
        _errorMessage(error.response?.data) ??
        'The request could not be completed.';
    if (status == 401) return AuthenticationFailure(message);
    if (status == 403) return PermissionFailure(message);
    if (status == 404 || status == 410) return UnavailableFailure(message);
    if (status == 426) return UpgradeRequiredFailure(message);
    if (status == 503) return MaintenanceFailure(message);
    if (status == null) {
      return const NetworkFailure('Check your connection and try again.');
    }
    return ApiFailure(message, 'HTTP_$status');
  }

  String? _errorMessage(Object? raw) {
    if (raw is! Map) return null;
    final Object? error = raw['error'];
    return error is Map ? error['message'] as String? : null;
  }

  String _uuid() {
    final Random random = Random.secure();
    final List<int> bytes = List<int>.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final String value =
        bytes.map((int byte) => byte.toRadixString(16).padLeft(2, '0')).join();
    return '${value.substring(0, 8)}-${value.substring(8, 12)}-${value.substring(12, 16)}-${value.substring(16, 20)}-${value.substring(20)}';
  }
}
