import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../models/domain.dart';
import '../providers/providers.dart';
import '../repositories/public_repository.dart';
import '../widgets/game_tile.dart';
import '../widgets/states.dart';

class BrowseScreen extends ConsumerWidget {
  const BrowseScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<CachedResult<List<TournamentSummary>>> tournaments = ref
        .watch(tournamentsProvider);
    final AsyncValue<CachedResult<List<GameSummary>>> games = ref.watch(
      gamesProvider,
    );
    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(tournamentsProvider);
        ref.invalidate(gamesProvider);
        await Future.wait(<Future<Object?>>[
          ref.read(tournamentsProvider.future),
          ref.read(gamesProvider.future),
        ]);
      },
      child: CustomScrollView(
        slivers: <Widget>[
          const SliverAppBar.large(
            title: Text('Basketball tournaments'),
            floating: true,
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: Row(
                children: <Widget>[
                  Text(
                    'Tournaments',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () async {
                      await context.push('/search');
                    },
                    child: const Text('Search'),
                  ),
                ],
              ),
            ),
          ),
          tournaments.when(
            loading:
                () =>
                    const SliverToBoxAdapter(child: LinearProgressIndicator()),
            error:
                (Object error, StackTrace _) => SliverFillRemaining(
                  child: FailureState(
                    error: error,
                    onRetry: () => ref.invalidate(tournamentsProvider),
                  ),
                ),
            data:
                (CachedResult<List<TournamentSummary>> result) =>
                    result.value.isEmpty
                        ? const SliverToBoxAdapter(
                          child: HonestEmptyState(
                            title: 'No tournaments published',
                            message:
                                'Published active and historical tournaments will appear here.',
                          ),
                        )
                        : SliverList.builder(
                          itemCount: result.value.length,
                          itemBuilder: (BuildContext context, int index) {
                            final TournamentSummary item = result.value[index];
                            return ListTile(
                              title: Text(item.name),
                              subtitle: Text(
                                '${item.startsAt.toLocal().toString().split(' ').first} – ${item.endsAt.toLocal().toString().split(' ').first}',
                              ),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () async {
                                await context.push('/tournaments/${item.id}');
                              },
                            );
                          },
                        ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
              child: Text(
                'Games',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
          ),
          games.when(
            loading:
                () =>
                    const SliverToBoxAdapter(child: LinearProgressIndicator()),
            error:
                (Object error, StackTrace _) => SliverToBoxAdapter(
                  child: FailureState(
                    error: error,
                    onRetry: () => ref.invalidate(gamesProvider),
                  ),
                ),
            data:
                (CachedResult<List<GameSummary>> result) =>
                    result.value.isEmpty
                        ? const SliverToBoxAdapter(
                          child: HonestEmptyState(
                            title: 'No games available',
                            message:
                                'Games will appear when organizers publish fixtures.',
                          ),
                        )
                        : SliverPadding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          sliver: SliverList.builder(
                            itemCount: result.value.take(8).length,
                            itemBuilder:
                                (BuildContext context, int index) =>
                                    GameTile(result.value[index]),
                          ),
                        ),
          ),
          const SliverPadding(padding: EdgeInsets.only(bottom: 32)),
        ],
      ),
    );
  }
}
