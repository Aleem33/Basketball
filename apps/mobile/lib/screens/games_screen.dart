import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/domain.dart';
import '../providers/providers.dart';
import '../repositories/public_repository.dart';
import '../widgets/game_tile.dart';
import '../widgets/states.dart';

class GamesScreen extends ConsumerWidget {
  const GamesScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<CachedResult<List<GameSummary>>> games = ref.watch(
      gamesProvider,
    );
    return Scaffold(
      appBar: AppBar(title: const Text('Games')),
      body: games.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error:
            (Object error, StackTrace _) => FailureState(
              error: error,
              onRetry: () => ref.invalidate(gamesProvider),
            ),
        data:
            (CachedResult<List<GameSummary>> data) =>
                data.value.isEmpty
                    ? const HonestEmptyState(
                      title: 'No published games',
                      message:
                          'Try again after an organizer publishes fixtures.',
                    )
                    : RefreshIndicator(
                      onRefresh: () async {
                        ref.invalidate(gamesProvider);
                        await ref.read(gamesProvider.future);
                      },
                      child: ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: data.value.length,
                        itemBuilder:
                            (BuildContext context, int index) =>
                                GameTile(data.value[index]),
                      ),
                    ),
      ),
    );
  }
}
