import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/providers.dart';
import '../theme/courtside_theme.dart';
import '../widgets/sports_ui.dart';
import '../widgets/states.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  Timer? _debounce;
  Future<Map<String, Object?>>? _results;
  String _query = '';

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  void _search(String value) {
    _debounce?.cancel();
    final String query = value.trim();
    _query = query;
    if (query.length < 2) {
      setState(() => _results = null);
      return;
    }

    _debounce = Timer(const Duration(milliseconds: 350), _runSearch);
  }

  void _runSearch() {
    final Future<Map<String, Object?>> search = ref
        .read(publicRepositoryProvider)
        .search(_query);
    setState(() => _results = search);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Search')),
    body: SportsBackdrop(
      child: Column(
        children: <Widget>[
          const SportsPageHeader(
            eyebrow: 'Discover',
            title: 'Find your team.',
            subtitle: 'Search tournaments, teams, and matchups.',
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: SearchBar(
              autoFocus: true,
              hintText: 'Tournaments, teams, or games',
              leading: const Icon(Icons.search),
              onChanged: _search,
            ),
          ),
          Expanded(
            child:
                _results == null
                    ? const HonestEmptyState(
                      title: 'Search public records',
                      message: 'Enter at least two characters.',
                    )
                    : FutureBuilder<Map<String, Object?>>(
                      future: _results,
                      builder: (
                        BuildContext context,
                        AsyncSnapshot<Map<String, Object?>> snapshot,
                      ) {
                        if (snapshot.connectionState != ConnectionState.done) {
                          return const Center(
                            child: CircularProgressIndicator(),
                          );
                        }
                        if (snapshot.hasError) {
                          return FailureState(
                            error: snapshot.error!,
                            onRetry: _runSearch,
                          );
                        }

                        final Map<String, Object?> data = snapshot.data!;
                        final List<Object?> tournaments =
                            data['tournaments']! as List<Object?>;
                        final List<Object?> teams =
                            data['teams']! as List<Object?>;
                        final List<Object?> games =
                            (data['games'] as List<Object?>?) ?? <Object?>[];
                        if (tournaments.isEmpty &&
                            teams.isEmpty &&
                            games.isEmpty) {
                          return const HonestEmptyState(
                            title: 'No matching records',
                            message:
                                'Try a different spelling or a broader search.',
                          );
                        }

                        return ListView(
                          padding: const EdgeInsets.only(bottom: 32),
                          children: <Widget>[
                            if (tournaments.isNotEmpty)
                              const SectionHeader('Tournaments'),
                            ...tournaments.map((Object? raw) {
                              final Map<String, Object?> row =
                                  (raw! as Map<Object?, Object?>)
                                      .cast<String, Object?>();
                              return _SearchResultTile(
                                icon: Icons.emoji_events_outlined,
                                title: Text(row['name']! as String),
                                onTap: () async {
                                  await context.push(
                                    '/tournaments/${row['id']}',
                                  );
                                },
                              );
                            }),
                            if (teams.isNotEmpty) const SectionHeader('Teams'),
                            ...teams.map((Object? raw) {
                              final Map<String, Object?> row =
                                  (raw! as Map<Object?, Object?>)
                                      .cast<String, Object?>();
                              return _SearchResultTile(
                                icon: Icons.groups_2_outlined,
                                title: Text(row['name']! as String),
                                onTap: () async {
                                  await context.push('/teams/${row['id']}');
                                },
                              );
                            }),
                            if (games.isNotEmpty) const SectionHeader('Games'),
                            ...games.map((Object? raw) {
                              final Map<String, Object?> row =
                                  (raw! as Map<Object?, Object?>)
                                      .cast<String, Object?>();
                              final Map<String, Object?>? homeTeam =
                                  (row['homeTeam'] as Map<Object?, Object?>?)
                                      ?.cast<String, Object?>();
                              final Map<String, Object?>? awayTeam =
                                  (row['awayTeam'] as Map<Object?, Object?>?)
                                      ?.cast<String, Object?>();
                              final String home =
                                  homeTeam?['name'] as String? ?? 'TBD';
                              final String away =
                                  awayTeam?['name'] as String? ?? 'TBD';
                              return _SearchResultTile(
                                icon: Icons.sports_basketball_outlined,
                                title: Text('$home vs $away'),
                                subtitle: Text(row['status']! as String),
                                onTap: () async {
                                  await context.push('/games/${row['id']}');
                                },
                              );
                            }),
                          ],
                        );
                      },
                    ),
          ),
        ],
      ),
    ),
  );
}

class _SearchResultTile extends StatelessWidget {
  const _SearchResultTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.subtitle,
  });

  final IconData icon;
  final Widget title;
  final Widget? subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
    child: ListTile(
      minTileHeight: 68,
      leading: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primary.withValues(alpha: .12),
          borderRadius: BorderRadius.circular(CourtsideRadii.small),
        ),
        child: Icon(icon, color: Theme.of(context).colorScheme.primary),
      ),
      title: title,
      subtitle: subtitle,
      trailing: const Icon(Icons.chevron_right_rounded),
      onTap: onTap,
    ),
  );
}
