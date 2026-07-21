import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/domain.dart';
import '../providers/providers.dart';
import '../repositories/public_repository.dart';
import '../theme/courtside_theme.dart';
import '../widgets/game_tile.dart';
import '../widgets/sports_ui.dart';
import '../widgets/states.dart';

class BrowseScreen extends ConsumerWidget {
  const BrowseScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tournaments = ref.watch(tournamentsProvider);
    final games = ref.watch(gamesProvider);
    return SportsBackdrop(
      child: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(tournamentsProvider);
          ref.invalidate(gamesProvider);
          await Future.wait(<Future<Object?>>[
            ref.read(tournamentsProvider.future),
            ref.read(gamesProvider.future),
          ]);
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: <Widget>[
            SliverAppBar(
              expandedHeight: 156,
              pinned: true,
              title: const Text('COURTSIDE'),
              actions: <Widget>[
                IconButton(
                  tooltip: 'Search tournaments and teams',
                  onPressed: () => context.push('/search'),
                  icon: const Icon(Icons.search_rounded),
                ),
                const SizedBox(width: 8),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 84, 16, 12),
                  child: Align(
                    alignment: Alignment.bottomLeft,
                    child: Text(
                      'Your game.\nYour moment.',
                      style: Theme.of(context).textTheme.headlineLarge,
                    ),
                  ),
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SectionHeader('Featured games')),
            games.when(
              loading:
                  () => const SliverToBoxAdapter(
                    child: SkeletonCard(height: 190),
                  ),
              error:
                  (Object error, StackTrace _) => SliverToBoxAdapter(
                    child: FailureState(
                      error: error,
                      onRetry: () => ref.invalidate(gamesProvider),
                    ),
                  ),
              data: (CachedResult<List<GameSummary>> result) {
                final List<GameSummary> featured =
                    result.value
                        .where(
                          (GameSummary game) => game.status == GameStatus.live,
                        )
                        .followedBy(
                          result.value.where(
                            (GameSummary game) =>
                                game.status != GameStatus.live,
                          ),
                        )
                        .take(3)
                        .toList();
                if (featured.isEmpty) {
                  return const SliverToBoxAdapter(
                    child: HonestEmptyState(
                      title: 'No games available',
                      message:
                          'Published fixtures and live scores will appear here.',
                    ),
                  );
                }
                return SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: SliverList.builder(
                    itemCount: featured.length,
                    itemBuilder:
                        (_, int index) =>
                            GameTile(featured[index], featured: index == 0),
                  ),
                );
              },
            ),
            const SliverToBoxAdapter(child: SectionHeader('Tournaments')),
            tournaments.when(
              loading:
                  () => const SliverToBoxAdapter(
                    child: SkeletonCard(height: 180),
                  ),
              error:
                  (Object error, StackTrace _) => SliverToBoxAdapter(
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
                                  'Active and historical tournaments will appear here.',
                            ),
                          )
                          : SliverToBoxAdapter(
                            child: SizedBox(
                              height: 206,
                              child: ListView.separated(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                ),
                                scrollDirection: Axis.horizontal,
                                itemCount: result.value.length,
                                separatorBuilder:
                                    (_, __) => const SizedBox(width: 12),
                                itemBuilder:
                                    (_, int index) =>
                                        TournamentCard(result.value[index]),
                              ),
                            ),
                          ),
            ),
            const SliverPadding(padding: EdgeInsets.only(bottom: 112)),
          ],
        ),
      ),
    );
  }
}
