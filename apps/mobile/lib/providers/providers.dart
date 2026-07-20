import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../config/app_config.dart';
import '../models/domain.dart';
import '../realtime/live_game_service.dart';
import '../repositories/auth_repository.dart';
import '../repositories/favorites_repository.dart';
import '../repositories/public_repository.dart';

final Provider<AppConfig> appConfigProvider = Provider<AppConfig>(
  (Ref ref) => AppConfig.fromEnvironment(),
);
final Provider<SharedPreferences> sharedPreferencesProvider =
    Provider<SharedPreferences>(
      (Ref ref) => throw UnimplementedError('Override at startup'),
    );
final Provider<TokenStore> tokenStoreProvider = Provider<TokenStore>(
  (Ref ref) => TokenStore(const FlutterSecureStorage()),
);
final Provider<ApiClient> apiClientProvider = Provider<ApiClient>(
  (Ref ref) =>
      ApiClient(ref.watch(appConfigProvider), ref.watch(tokenStoreProvider)),
);
final Provider<PublicRepository> publicRepositoryProvider =
    Provider<PublicRepository>(
      (Ref ref) => PublicRepository(
        ref.watch(apiClientProvider),
        ref.watch(sharedPreferencesProvider),
      ),
    );
final Provider<AuthRepository> authRepositoryProvider =
    Provider<AuthRepository>(
      (Ref ref) => AuthRepository(
        ref.watch(apiClientProvider),
        ref.watch(tokenStoreProvider),
      ),
    );
final Provider<FavoritesRepository> favoritesRepositoryProvider =
    Provider<FavoritesRepository>(
      (Ref ref) => FavoritesRepository(
        ref.watch(apiClientProvider),
        ref.watch(sharedPreferencesProvider),
      ),
    );
final Provider<LiveGameService> liveGameServiceProvider =
    Provider<LiveGameService>((Ref ref) {
      final LiveGameService service = LiveGameService(
        ref.watch(appConfigProvider),
      );
      ref.onDispose(service.dispose);
      return service;
    });

final FutureProvider<CachedResult<List<TournamentSummary>>>
tournamentsProvider = FutureProvider<CachedResult<List<TournamentSummary>>>(
  (Ref ref) => ref.watch(publicRepositoryProvider).tournaments(),
);
final FutureProvider<CachedResult<List<GameSummary>>> gamesProvider =
    FutureProvider<CachedResult<List<GameSummary>>>(
      (Ref ref) => ref.watch(publicRepositoryProvider).games(),
    );

class AuthController extends StateNotifier<AsyncValue<AuthUser?>> {
  AuthController(this._repository)
    : super(const AsyncValue<AuthUser?>.data(null));
  final AuthRepository _repository;
  Future<void> login(String email, String password) async {
    state = const AsyncValue<AuthUser?>.loading();
    state = await AsyncValue.guard(() => _repository.login(email, password));
  }

  Future<void> logout() async {
    await _repository.logout();
    state = const AsyncValue<AuthUser?>.data(null);
  }
}

final StateNotifierProvider<AuthController, AsyncValue<AuthUser?>>
authControllerProvider =
    StateNotifierProvider<AuthController, AsyncValue<AuthUser?>>(
      (Ref ref) => AuthController(ref.watch(authRepositoryProvider)),
    );

final StreamProviderFamily<GameSummary, ({String id, int version})>
liveGameProvider = StreamProvider.family<
  GameSummary,
  ({String id, int version})
>((Ref ref, ({String id, int version}) parameters) {
  final LiveGameService service = ref.watch(liveGameServiceProvider);
  service.watch(parameters.id, parameters.version);
  ref.onDispose(service.stop);
  return service.updates.where((GameSummary game) => game.id == parameters.id);
});
