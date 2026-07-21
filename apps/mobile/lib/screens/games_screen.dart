import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../models/domain.dart';
import '../providers/providers.dart';
import '../repositories/public_repository.dart';
import '../widgets/game_tile.dart';
import '../widgets/sports_ui.dart';
import '../widgets/states.dart';

class GamesScreen extends ConsumerWidget {
  const GamesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final games = ref.watch(gamesProvider);
    return Scaffold(
      body: SportsBackdrop(
        child: CustomScrollView(
          slivers: <Widget>[
            const SliverAppBar.large(title: Text('Games'), pinned: true),
            games.when(
              loading:
                  () => const SliverToBoxAdapter(
                    child: SkeletonCard(height: 190),
                  ),
              error:
                  (Object error, StackTrace _) => SliverFillRemaining(
                    child: FailureState(
                      error: error,
                      onRetry: () => ref.invalidate(gamesProvider),
                    ),
                  ),
              data: (CachedResult<List<GameSummary>> data) {
                if (data.value.isEmpty) {
                  return const SliverFillRemaining(
                    child: HonestEmptyState(
                      title: 'No published games',
                      message:
                          'Fixtures will appear as soon as organizers publish them.',
                    ),
                  );
                }
                final Map<DateTime, List<GameSummary>> groups =
                    <DateTime, List<GameSummary>>{};
                for (final GameSummary game in data.value) {
                  final DateTime local = game.scheduledAt.toLocal();
                  final DateTime day = DateTime(
                    local.year,
                    local.month,
                    local.day,
                  );
                  groups.putIfAbsent(day, () => <GameSummary>[]).add(game);
                }
                final List<Widget> children = <Widget>[];
                for (final MapEntry<DateTime, List<GameSummary>> group
                    in groups.entries) {
                  children
                    ..add(SectionHeader(_dayLabel(group.key)))
                    ..addAll(group.value.map(GameTile.new));
                }
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 112),
                  sliver: SliverList.list(children: children),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  String _dayLabel(DateTime day) {
    final DateTime now = DateTime.now();
    final DateTime today = DateTime(now.year, now.month, now.day);
    if (day == today) return 'Today';
    if (day == today.add(const Duration(days: 1))) return 'Tomorrow';
    return DateFormat('EEEE, MMM d').format(day);
  }
}
