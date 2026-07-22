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
    final announcements = ref.watch(announcementsProvider);
    final String appName = ref.watch(appConfigProvider).appName;

    return SportsBackdrop(
      child: RefreshIndicator(
        onRefresh: () async {
          ref
            ..invalidate(tournamentsProvider)
            ..invalidate(gamesProvider)
            ..invalidate(announcementsProvider);
          await Future.wait(<Future<Object?>>[
            ref.read(tournamentsProvider.future),
            ref.read(gamesProvider.future),
            ref
                .read(announcementsProvider.future)
                .catchError((Object _) => const <AnnouncementSummary>[]),
          ]);
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: <Widget>[
            SliverAppBar(
              pinned: true,
              toolbarHeight: 72,
              backgroundColor: CourtsideColors.overlay,
              title: Row(
                children: <Widget>[
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primary,
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: const Icon(
                      Icons.sports_basketball_rounded,
                      color: CourtsideColors.background,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Text(
                      appName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              actions: <Widget>[
                IconButton(
                  tooltip: 'Search tournaments, teams, and games',
                  onPressed: () => context.push('/search'),
                  icon: const Icon(Icons.search_rounded),
                ),
                const SizedBox(width: 8),
              ],
            ),
            const SliverToBoxAdapter(
              child: SportsPageHeader(
                eyebrow: 'Game day',
                title: 'All the action.\nRight here.',
                subtitle: 'Live scores, fixtures, and tournament updates.',
              ),
            ),
            announcements.when(
              loading: () => const SliverToBoxAdapter(
                child: SkeletonCard(height: 138),
              ),
              error: (_, __) => const SliverToBoxAdapter(child: SizedBox.shrink()),
              data: (List<AnnouncementSummary> items) =>
                  items.isEmpty
                      ? const SliverToBoxAdapter(child: SizedBox.shrink())
                      : SliverToBoxAdapter(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: <Widget>[
                            const SectionHeader('Latest announcements'),
                            AnnouncementCarousel(announcements: items),
                          ],
                        ),
                      ),
            ),
            games.when(
              loading: () => const SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    SectionHeader('Live now'),
                    SkeletonCard(height: 270),
                  ],
                ),
              ),
              error: (Object error, StackTrace _) => SliverToBoxAdapter(
                child: FailureState(
                  error: error,
                  onRetry: () => ref.invalidate(gamesProvider),
                ),
              ),
              data: (CachedResult<List<GameSummary>> result) =>
                  SliverToBoxAdapter(child: _GamesSpotlight(result)),
            ),
            const SliverToBoxAdapter(child: SectionHeader('Tournaments')),
            tournaments.when(
              loading: () => const SliverToBoxAdapter(child: SkeletonCard(height: 180)),
              error: (Object error, StackTrace _) => SliverToBoxAdapter(
                child: FailureState(
                  error: error,
                  onRetry: () => ref.invalidate(tournamentsProvider),
                ),
              ),
              data: (CachedResult<List<TournamentSummary>> result) =>
                  SliverToBoxAdapter(
                    child: Column(
                      children: <Widget>[
                        if (result.isStale) const StaleDataNotice(),
                        if (result.value.isEmpty)
                          const HonestEmptyState(
                            title: 'No tournaments published',
                            message: 'Active and historical tournaments will appear here.',
                          )
                        else
                          SizedBox(
                            height: 214 +
                                ((MediaQuery.textScalerOf(context)
                                                .scale(1)
                                                .clamp(1.0, 2.0)
                                                .toDouble() -
                                            1) *
                                        64),
                            child: ListView.separated(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              scrollDirection: Axis.horizontal,
                              itemCount: result.value.length,
                              separatorBuilder: (_, __) => const SizedBox(width: 12),
                              itemBuilder: (_, int index) => TournamentCard(result.value[index]),
                            ),
                          ),
                      ],
                    ),
                  ),
            ),
            const SliverPadding(padding: EdgeInsets.only(bottom: 116)),
          ],
        ),
      ),
    );
  }
}

class _GamesSpotlight extends StatelessWidget {
  const _GamesSpotlight(this.result);
  final CachedResult<List<GameSummary>> result;

  @override
  Widget build(BuildContext context) {
    final double textScale = MediaQuery.textScalerOf(context)
        .scale(1)
        .clamp(1.0, 2.0)
        .toDouble();
    final List<GameSummary> live = result.value
        .where((GameSummary game) =>
            game.status == GameStatus.live || game.status == GameStatus.paused)
        .toList();
    final List<GameSummary> updates = result.value
        .where((GameSummary game) =>
            game.status != GameStatus.live && game.status != GameStatus.paused)
        .take(4)
        .toList();

    if (result.value.isEmpty) {
      return const Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          SectionHeader('Live now'),
          HonestEmptyState(
            title: 'No games available',
            message: 'Published fixtures and live scores will appear here.',
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (result.isStale) const StaleDataNotice(),
        SectionHeader(live.isEmpty ? 'Featured games' : 'Live now'),
        SizedBox(
          height: 296 + ((textScale - 1) * 72),
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: (live.isEmpty ? result.value.take(3) : live).length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (BuildContext context, int index) {
              final List<GameSummary> items =
                  (live.isEmpty ? result.value.take(3) : live).toList();
              return SizedBox(
                width: (MediaQuery.sizeOf(context).width * .86)
                    .clamp(282.0, 390.0)
                    .toDouble(),
                child: GameTile(items[index], featured: true),
              );
            },
          ),
        ),
        if (updates.isNotEmpty) ...<Widget>[
          const SectionHeader('Schedule & results'),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: updates.map(GameTile.new).toList(growable: false),
            ),
          ),
        ],
      ],
    );
  }
}
