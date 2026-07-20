import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/providers.dart';
import '../widgets/states.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  Timer? _debounce;
  Future<Map<String, Object?>>? _results;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  void _search(String value) {
    _debounce?.cancel();
    final String query = value.trim();
    if (query.length < 2) {
      setState(() => _results = null);
      return;
    }

    _debounce = Timer(const Duration(milliseconds: 350), () {
      final Future<Map<String, Object?>> search = ref
          .read(publicRepositoryProvider)
          .search(query);
      setState(() => _results = search);
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Search')),
    body: Column(
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.all(16),
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
                        return const Center(child: CircularProgressIndicator());
                      }
                      if (snapshot.hasError) {
                        return FailureState(
                          error: snapshot.error!,
                          onRetry: () => setState(() {}),
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
                        children: <Widget>[
                          if (tournaments.isNotEmpty)
                            const ListTile(title: Text('Tournaments')),
                          ...tournaments.map((Object? raw) {
                            final Map<String, Object?> row =
                                (raw! as Map<Object?, Object?>)
                                    .cast<String, Object?>();
                            return ListTile(
                              title: Text(row['name']! as String),
                              onTap: () async {
                                await context.push('/tournaments/${row['id']}');
                              },
                            );
                          }),
                          if (teams.isNotEmpty)
                            const ListTile(title: Text('Teams')),
                          ...teams.map((Object? raw) {
                            final Map<String, Object?> row =
                                (raw! as Map<Object?, Object?>)
                                    .cast<String, Object?>();
                            return ListTile(
                              title: Text(row['name']! as String),
                              onTap: () async {
                                await context.push('/teams/${row['id']}');
                              },
                            );
                          }),
                          if (games.isNotEmpty)
                            const ListTile(title: Text('Games')),
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
                            return ListTile(
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
  );
}
