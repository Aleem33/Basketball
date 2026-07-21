import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../models/domain.dart';
import '../providers/providers.dart';
import '../repositories/public_repository.dart';
import '../theme/courtside_theme.dart';
import '../widgets/game_tile.dart';
import '../widgets/sports_ui.dart';
import '../widgets/states.dart';

enum _GameFilter { all, live, upcoming, finalScore }

class GamesScreen extends ConsumerStatefulWidget {
  const GamesScreen({super.key});

  @override
  ConsumerState<GamesScreen> createState() => _GamesScreenState();
}

class _GamesScreenState extends ConsumerState<GamesScreen> {
  _GameFilter _filter = _GameFilter.all;

  @override
  Widget build(BuildContext context) {
    final games = ref.watch(gamesProvider);
    return Scaffold(
      body: SportsBackdrop(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(gamesProvider);
            await ref.read(gamesProvider.future);
          },
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: <Widget>[
              const SliverAppBar.large(title: Text('Scores'), pinned: true),
              SliverToBoxAdapter(
                child: _FilterBar(value: _filter, onChanged: _setFilter),
              ),
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
                data: _buildGames,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _setFilter(_GameFilter value) => setState(() => _filter = value);

  Widget _buildGames(CachedResult<List<GameSummary>> data) {
    final List<GameSummary> filtered =
        data.value.where(_matchesFilter).toList();
    if (filtered.isEmpty) {
      return SliverFillRemaining(
        hasScrollBody: false,
        child: HonestEmptyState(
          title:
              _filter == _GameFilter.all
                  ? 'No published games'
                  : 'No ${_label(_filter).toLowerCase()} games',
          message:
              'Fixtures and results will appear here when organizers publish them.',
        ),
      );
    }
    final Map<DateTime, List<GameSummary>> groups =
        <DateTime, List<GameSummary>>{};
    for (final GameSummary game in filtered) {
      final DateTime local = game.scheduledAt.toLocal();
      final DateTime day = DateTime(local.year, local.month, local.day);
      groups.putIfAbsent(day, () => <GameSummary>[]).add(game);
    }
    final List<Widget> children = <Widget>[];
    for (final MapEntry<DateTime, List<GameSummary>> group in groups.entries) {
      children
        ..add(SectionHeader(_dayLabel(group.key)))
        ..addAll(group.value.map(GameTile.new));
    }
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 112),
      sliver: SliverList.list(children: children),
    );
  }

  bool _matchesFilter(GameSummary game) => switch (_filter) {
    _GameFilter.all => true,
    _GameFilter.live =>
      game.status == GameStatus.live || game.status == GameStatus.paused,
    _GameFilter.upcoming =>
      game.status == GameStatus.scheduled || game.status == GameStatus.draft,
    _GameFilter.finalScore => <GameStatus>{
      GameStatus.finalScore,
      GameStatus.forfeited,
      GameStatus.abandoned,
      GameStatus.cancelled,
      GameStatus.postponed,
    }.contains(game.status),
  };

  String _dayLabel(DateTime day) {
    final DateTime now = DateTime.now();
    final DateTime today = DateTime(now.year, now.month, now.day);
    if (day == today) return 'Today';
    if (day == today.add(const Duration(days: 1))) return 'Tomorrow';
    return DateFormat('EEEE, MMM d').format(day);
  }
}

class _FilterBar extends StatelessWidget {
  const _FilterBar({required this.value, required this.onChanged});

  final _GameFilter value;
  final ValueChanged<_GameFilter> onChanged;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
    child: Row(
      children:
          _GameFilter.values.map((_GameFilter filter) {
            final bool selected = value == filter;
            return Padding(
              padding: const EdgeInsets.only(right: 9),
              child: ChoiceChip(
                selected: selected,
                showCheckmark: false,
                avatar:
                    filter == _GameFilter.live
                        ? Icon(
                          Icons.circle,
                          size: 8,
                          color:
                              selected
                                  ? CourtsideColors.background
                                  : CourtsideColors.live,
                        )
                        : null,
                label: Text(_label(filter)),
                onSelected: (_) => onChanged(filter),
              ),
            );
          }).toList(),
    ),
  );
}

String _label(_GameFilter filter) => switch (filter) {
  _GameFilter.all => 'All',
  _GameFilter.live => 'Live',
  _GameFilter.upcoming => 'Upcoming',
  _GameFilter.finalScore => 'Final',
};
