import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';

import '../models/domain.dart';
import '../providers/providers.dart';
import '../widgets/favorite_toggle.dart';
import '../widgets/sports_ui.dart';
import '../widgets/states.dart';

class TournamentDetailScreen extends ConsumerWidget {
  const TournamentDetailScreen(this.id, {super.key});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final Future<Map<String, Object?>> tournament = ref
        .read(publicRepositoryProvider)
        .tournament(id);

    return _MapFutureScaffold(
      title: 'Tournament',
      future: tournament,
      builder: (Map<String, Object?> data) {
        final List<Object?> divisions =
            (data['divisions'] as List<Object?>?) ?? <Object?>[];
        final List<Object?> announcements =
            (data['announcements'] as List<Object?>?) ?? <Object?>[];

        return ListView(
          padding: const EdgeInsets.all(16),
          children: <Widget>[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        data['name']! as String,
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      Text(data['status']! as String),
                    ],
                  ),
                ),
                FavoriteToggle(id: id, kind: FavoriteKind.tournament),
                IconButton(
                  tooltip: 'Share tournament',
                  onPressed: () async {
                    await SharePlus.instance.share(
                      ShareParams(
                        uri: Uri.parse(
                          '${ref.read(appConfigProvider).deepLinkScheme}://tournaments/$id',
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.share_outlined),
                ),
              ],
            ),
            if (data['description'] is String &&
                (data['description']! as String).isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(data['description']! as String),
              ),
            const Divider(),
            Text(
              'Competition stages',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            if (divisions.isEmpty)
              const HonestEmptyState(
                title: 'No published stages',
                message: 'Competition structure has not been published.',
              ),
            ...divisions.expand((Object? raw) {
              final Map<String, Object?> division =
                  (raw! as Map<Object?, Object?>).cast<String, Object?>();
              final List<Object?> stages = division['stages']! as List<Object?>;

              return <Widget>[
                ListTile(title: Text(division['name']! as String)),
                ...stages.map((Object? stageRaw) {
                  final Map<String, Object?> stage =
                      (stageRaw! as Map<Object?, Object?>)
                          .cast<String, Object?>();
                  return Card(
                    child: ListTile(
                      title: Text(stage['name']! as String),
                      subtitle: Text(stage['format']! as String),
                      trailing: PopupMenuButton<String>(
                        onSelected: (String action) async {
                          await context.push('/stages/${stage['id']}/$action');
                        },
                        itemBuilder:
                            (_) => const <PopupMenuEntry<String>>[
                              PopupMenuItem<String>(
                                value: 'standings',
                                child: Text('Standings'),
                              ),
                              PopupMenuItem<String>(
                                value: 'bracket',
                                child: Text('Bracket'),
                              ),
                            ],
                      ),
                    ),
                  );
                }),
              ];
            }),
            const Divider(),
            Text(
              'Announcements',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            if (announcements.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('No current announcements.'),
              ),
            ...announcements.map((Object? raw) {
              final Map<String, Object?> row =
                  (raw! as Map<Object?, Object?>).cast<String, Object?>();
              return Card(
                child: ListTile(
                  title: Text(row['title']! as String),
                  subtitle: Text(row['body']! as String),
                ),
              );
            }),
          ],
        );
      },
    );
  }
}

class TeamDetailScreen extends ConsumerWidget {
  const TeamDetailScreen(this.id, {super.key});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final Future<Map<String, Object?>> team = ref
        .read(publicRepositoryProvider)
        .team(id);

    return _MapFutureScaffold(
      title: 'Team',
      future: team,
      builder: (Map<String, Object?> data) {
        final List<Object?> players =
            (data['players'] as List<Object?>?) ?? <Object?>[];

        return ListView(
          padding: const EdgeInsets.all(16),
          children: <Widget>[
            Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    data['name']! as String,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                ),
                FavoriteToggle(id: id, kind: FavoriteKind.team),
                IconButton(
                  tooltip: 'Share team',
                  onPressed: () async {
                    await SharePlus.instance.share(
                      ShareParams(
                        uri: Uri.parse(
                          '${ref.read(appConfigProvider).deepLinkScheme}://teams/$id',
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.share_outlined),
                ),
              ],
            ),
            if (data['description'] is String)
              Text(data['description']! as String),
            const SizedBox(height: 20),
            Text(
              'Public roster',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            if (players.isEmpty)
              const HonestEmptyState(
                title: 'Roster not public',
                message: 'No public player records are available.',
              ),
            ...players.map((Object? raw) {
              final Map<String, Object?> row =
                  (raw! as Map<Object?, Object?>).cast<String, Object?>();
              return ListTile(
                leading: CircleAvatar(
                  child: Text(row['defaultJersey']?.toString() ?? '–'),
                ),
                title: Text('${row['givenName']} ${row['familyName']}'),
                subtitle: Text(
                  (row['position'] as String?)?.replaceAll('_', ' ') ??
                      'Position not listed',
                ),
              );
            }),
          ],
        );
      },
    );
  }
}

class GameDetailScreen extends ConsumerStatefulWidget {
  const GameDetailScreen(this.id, {super.key});

  final String id;

  @override
  ConsumerState<GameDetailScreen> createState() => _GameDetailScreenState();
}

class _GameDetailScreenState extends ConsumerState<GameDetailScreen> {
  late Future<Map<String, Object?>> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(publicRepositoryProvider).game(widget.id);
  }

  void _retry() {
    setState(() {
      _future = ref.read(publicRepositoryProvider).game(widget.id);
    });
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<Map<String, Object?>>(
    future: _future,
    builder: (
      BuildContext context,
      AsyncSnapshot<Map<String, Object?>> snapshot,
    ) {
      if (snapshot.connectionState != ConnectionState.done) {
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      }
      if (snapshot.hasError) {
        return Scaffold(
          appBar: AppBar(),
          body: FailureState(error: snapshot.error!, onRetry: _retry),
        );
      }

      final Map<String, Object?> data = snapshot.data!;
      final Map<String, Object?> home =
          ((data['homeTeam'] as Map<Object?, Object?>?) ??
                  <String, Object?>{'id': '', 'name': 'To be decided'})
              .cast<String, Object?>();
      final Map<String, Object?> away =
          ((data['awayTeam'] as Map<Object?, Object?>?) ??
                  <String, Object?>{'id': '', 'name': 'To be decided'})
              .cast<String, Object?>();
      final GameSummary base = GameSummary(
        id: widget.id,
        scheduledAt: DateTime.parse(data['scheduledAt']! as String),
        status: gameStatusFromJson(data['status']! as String),
        homeTeam: TeamSummary(
          id: home['id']! as String,
          name: home['name']! as String,
          shortName: home['shortName'] as String?,
          logoUrl: home['logoUrl'] as String?,
        ),
        awayTeam: TeamSummary(
          id: away['id']! as String,
          name: away['name']! as String,
          shortName: away['shortName'] as String?,
          logoUrl: away['logoUrl'] as String?,
        ),
        homeScore: data['homeScore']! as int,
        awayScore: data['awayScore']! as int,
        version: data['version']! as int,
        currentPeriod: data['currentPeriod']! as int,
      );
      ref.read(liveGameServiceProvider).seed(base);
      final AsyncValue<GameSummary> live = ref.watch(
        liveGameProvider((id: widget.id, version: base.version)),
      );
      final GameSummary game = live.asData?.value ?? base;
      final List<Object?> periods =
          (data['periods'] as List<Object?>?) ?? <Object?>[];
      final Map<String, Object?>? venue =
          (data['venue'] as Map<Object?, Object?>?)?.cast<String, Object?>();
      final Map<String, Object?>? court =
          (data['court'] as Map<Object?, Object?>?)?.cast<String, Object?>();

      return Scaffold(
        appBar: AppBar(
          title: const Text('Game details'),
          actions: <Widget>[
            IconButton(
              tooltip: 'Share game',
              onPressed: () async {
                await SharePlus.instance.share(
                  ShareParams(
                    uri: Uri.parse(
                      '${ref.read(appConfigProvider).deepLinkScheme}://games/${widget.id}',
                    ),
                  ),
                );
              },
              icon: const Icon(Icons.share_outlined),
            ),
          ],
        ),
        body: SportsBackdrop(
          child: RefreshIndicator(
            onRefresh: () async {
              final Future<Map<String, Object?>> refresh = ref
                  .read(publicRepositoryProvider)
                  .game(widget.id);
              setState(() => _future = refresh);
              await refresh;
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: <Widget>[
                const SizedBox(height: 4),
                Center(child: GameStatusBadge(game.status)),
                const SizedBox(height: 12),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: _ScoreTeam(
                        team: game.homeTeam,
                        score: game.homeScore,
                      ),
                    ),
                    Text(
                      '–',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    Expanded(
                      child: _ScoreTeam(
                        team: game.awayTeam,
                        score: game.awayScore,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Center(
                  child: Text(
                    DateFormat.yMMMd().add_jm().format(
                      game.scheduledAt.toLocal(),
                    ),
                  ),
                ),
                if (live.isLoading)
                  const Padding(
                    padding: EdgeInsets.all(8),
                    child: Center(child: Text('Connecting to live updates…')),
                  ),
                const Divider(height: 32),
                const SectionHeader('Period scores'),
                if (periods.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No period scores have been recorded.'),
                  ),
                ...periods.map((Object? raw) {
                  final Map<String, Object?> row =
                      (raw! as Map<Object?, Object?>).cast<String, Object?>();
                  return Card(
                    child: ListTile(
                      title: Text('Period ${row['periodNumber']}'),
                      trailing: Text(
                        '${row['homeScore']} – ${row['awayScore']}',
                      ),
                    ),
                  );
                }),
                if (venue != null)
                  Card(
                    child: ListTile(
                      leading: const Icon(Icons.location_on_outlined),
                      title: Text(venue['name']! as String),
                      subtitle: Text(
                        court?['name'] as String? ?? 'Court not specified',
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
    },
  );
}

class _ScoreTeam extends StatelessWidget {
  const _ScoreTeam({required this.team, required this.score});

  final TeamSummary? team;
  final int score;

  @override
  Widget build(BuildContext context) => Column(
    children: <Widget>[
      TeamCrest(team: team, size: 64),
      const SizedBox(height: 10),
      Text(
        team?.shortName ?? team?.name ?? 'TBD',
        textAlign: TextAlign.center,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: Theme.of(context).textTheme.titleMedium,
      ),
      AnimatedSwitcher(
        duration:
            MediaQuery.disableAnimationsOf(context)
                ? Duration.zero
                : const Duration(milliseconds: 240),
        child: Text(
          '$score',
          key: ValueKey<int>(score),
          style: Theme.of(context).textTheme.displaySmall,
        ),
      ),
    ],
  );
}

class StandingsScreen extends ConsumerWidget {
  const StandingsScreen(this.stageId, {super.key});

  final String stageId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final Future<Map<String, Object?>> standings = ref
        .read(publicRepositoryProvider)
        .standings(stageId);

    return _MapFutureScaffold(
      title: 'Standings',
      future: standings,
      builder: (Map<String, Object?> data) {
        final List<Object?> rows = data['standings']! as List<Object?>;
        if (rows.isEmpty) {
          return const HonestEmptyState(
            title: 'No standings yet',
            message:
                'Standings appear after authoritative results are finalized.',
          );
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(12),
          scrollDirection: Axis.horizontal,
          child: DataTable(
            columns: const <DataColumn>[
              DataColumn(label: Text('#')),
              DataColumn(label: Text('Team')),
              DataColumn(label: Text('P')),
              DataColumn(label: Text('W')),
              DataColumn(label: Text('L')),
              DataColumn(label: Text('PF')),
              DataColumn(label: Text('PA')),
              DataColumn(label: Text('Pts')),
            ],
            rows:
                rows.map((Object? raw) {
                  final Map<String, Object?> row =
                      (raw! as Map<Object?, Object?>).cast<String, Object?>();
                  final Map<String, Object?> team =
                      (row['team']! as Map<Object?, Object?>)
                          .cast<String, Object?>();
                  return DataRow(
                    cells: <DataCell>[
                      DataCell(Text('${row['rank']}')),
                      DataCell(Text(team['name']! as String)),
                      DataCell(Text('${row['played']}')),
                      DataCell(Text('${row['wins']}')),
                      DataCell(Text('${row['losses']}')),
                      DataCell(Text('${row['pointsFor']}')),
                      DataCell(Text('${row['pointsAgainst']}')),
                      DataCell(Text('${row['standingPoints']}')),
                    ],
                  );
                }).toList(),
          ),
        );
      },
    );
  }
}

class BracketScreen extends ConsumerWidget {
  const BracketScreen(this.stageId, {super.key});

  final String stageId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final Future<Map<String, Object?>> bracket = ref
        .read(publicRepositoryProvider)
        .bracket(stageId);

    return _MapFutureScaffold(
      title: 'Bracket',
      future: bracket,
      builder: (Map<String, Object?> data) {
        final List<Object?> rounds = data['rounds']! as List<Object?>;
        return ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.all(12),
          children:
              rounds.map((Object? raw) {
                final Map<String, Object?> round =
                    (raw! as Map<Object?, Object?>).cast<String, Object?>();
                final List<Object?> links = round['links']! as List<Object?>;
                return SizedBox(
                  width: 280,
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: <Widget>[
                          Text(
                            round['name']! as String,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 8),
                          ...links.map((Object? linkRaw) {
                            final Map<String, Object?> link =
                                (linkRaw! as Map<Object?, Object?>)
                                    .cast<String, Object?>();
                            final Map<String, Object?> game =
                                (link['sourceGame']! as Map<Object?, Object?>)
                                    .cast<String, Object?>();
                            final Map<String, Object?>? home =
                                (game['homeTeam'] as Map<Object?, Object?>?)
                                    ?.cast<String, Object?>();
                            final Map<String, Object?>? away =
                                (game['awayTeam'] as Map<Object?, Object?>?)
                                    ?.cast<String, Object?>();
                            return Card(
                              child: ListTile(
                                title: Text(home?['name'] as String? ?? 'TBD'),
                                subtitle: Text(
                                  away?['name'] as String? ?? 'TBD',
                                ),
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
        );
      },
    );
  }
}

class _MapFutureScaffold extends StatelessWidget {
  const _MapFutureScaffold({
    required this.title,
    required this.future,
    required this.builder,
  });

  final String title;
  final Future<Map<String, Object?>> future;
  final Widget Function(Map<String, Object?>) builder;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(title)),
    body: SportsBackdrop(
      child: FutureBuilder<Map<String, Object?>>(
        future: future,
        builder: (
          BuildContext context,
          AsyncSnapshot<Map<String, Object?>> snapshot,
        ) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return FailureState(error: snapshot.error!, onRetry: () {});
          }
          return builder(snapshot.data!);
        },
      ),
    ),
  );
}
