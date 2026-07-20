import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/app_config.dart';
import '../models/domain.dart';

class LiveGameService {
  LiveGameService(this._config);
  final AppConfig _config;
  io.Socket? _socket;
  GameSummary? _current;
  final StreamController<GameSummary> _updates =
      StreamController<GameSummary>.broadcast();
  Stream<GameSummary> get updates => _updates.stream;

  void seed(GameSummary game) {
    if (_current?.id != game.id || game.version >= (_current?.version ?? -1)) {
      _current = game;
    }
  }

  void watch(String gameId, int lastKnownVersion) {
    unawaited(stop());
    final io.Socket socket = io.io(
      _config.websocketUrl.toString(),
      io.OptionBuilder()
          .setPath('/live/socket.io')
          .setTransports(<String>['websocket'])
          .disableAutoConnect()
          .enableReconnection()
          .build(),
    );
    _socket = socket;
    void join() => socket.emitWithAck('game.join', <String, Object>{
      'gameId': gameId,
      'lastKnownVersion': _current?.version ?? lastKnownVersion,
    }, ack: _handleAck);
    socket.onConnect((Object? _) => join());
    socket.on('game.updated', (Object? raw) {
      if (raw is Map && raw['game'] is Map) {
        _merge((raw['game']! as Map).cast<String, Object?>());
      }
    });
    socket.onReconnect((Object? _) => join());
    socket.connect();
  }

  void _handleAck(Object? raw) {
    if (raw is Map && raw['ok'] == true && raw['game'] is Map) {
      _merge((raw['game']! as Map).cast<String, Object?>());
    }
  }

  void _merge(Map<String, Object?> state) {
    final GameSummary? current = _current;
    if (current == null || current.id != state['id']) {
      if (state.containsKey('scheduledAt')) {
        _current = GameSummary.fromJson(state);
        _updates.add(_current!);
      }
      return;
    }
    final int nextVersion = (state['version'] as int?) ?? current.version;
    if (nextVersion < current.version) return;
    final GameSummary next = current.copyWith(
      status:
          state['status'] is String
              ? gameStatusFromJson(state['status']! as String)
              : null,
      homeScore: state['homeScore'] as int?,
      awayScore: state['awayScore'] as int?,
      currentPeriod: state['currentPeriod'] as int?,
      version: nextVersion,
    );
    _current = next;
    _updates.add(next);
  }

  Future<void> stop() async {
    _socket?.dispose();
    _socket = null;
  }

  Future<void> dispose() async {
    await stop();
    await _updates.close();
  }
}
