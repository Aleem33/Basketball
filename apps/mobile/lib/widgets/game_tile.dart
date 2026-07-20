import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../models/domain.dart';

class GameTile extends StatelessWidget {
  const GameTile(this.game, {super.key});
  final GameSummary game;
  @override
  Widget build(BuildContext context) => Card(child: InkWell(
    onTap: () => context.push('/games/${game.id}'),
    borderRadius: BorderRadius.circular(12),
    child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
      Row(children: <Widget>[
        _StatusPill(game.status),
        const Spacer(),
        Text(DateFormat.MMMd().add_jm().format(game.scheduledAt.toLocal()), style: Theme.of(context).textTheme.bodySmall),
      ]),
      const SizedBox(height: 12),
      _TeamScore(name: game.homeTeam?.name ?? 'To be decided', score: game.homeScore, showScore: _showScore(game.status)),
      const SizedBox(height: 8),
      _TeamScore(name: game.awayTeam?.name ?? 'To be decided', score: game.awayScore, showScore: _showScore(game.status)),
    ])),
  ));

  bool _showScore(GameStatus status) => <GameStatus>[GameStatus.live, GameStatus.paused, GameStatus.finalScore, GameStatus.forfeited, GameStatus.abandoned].contains(status);
}

class _TeamScore extends StatelessWidget {
  const _TeamScore({required this.name, required this.score, required this.showScore});
  final String name;
  final int score;
  final bool showScore;
  @override Widget build(BuildContext context) => Row(children: <Widget>[Expanded(child: Text(name, style: Theme.of(context).textTheme.titleMedium)), if (showScore) Text('$score', style: Theme.of(context).textTheme.headlineSmall)]);
}

class _StatusPill extends StatelessWidget {
  const _StatusPill(this.status);
  final GameStatus status;
  @override Widget build(BuildContext context) {
    final (String, Color) presentation = switch (status) {
      GameStatus.live => ('LIVE', Colors.red.shade700),
      GameStatus.paused => ('PAUSED', Colors.orange.shade800),
      GameStatus.finalScore => ('FINAL', Colors.blueGrey),
      GameStatus.postponed => ('POSTPONED', Colors.orange.shade800),
      GameStatus.cancelled => ('CANCELLED', Colors.red.shade800),
      GameStatus.abandoned => ('ABANDONED', Colors.red.shade800),
      GameStatus.forfeited => ('FORFEIT', Colors.deepPurple),
      GameStatus.draft => ('DRAFT', Colors.blueGrey),
      GameStatus.scheduled => ('UPCOMING', Colors.green.shade800),
    };
    return Semantics(label: 'Game status ${presentation.$1}', child: Container(decoration: BoxDecoration(color: presentation.$2.withValues(alpha: .12), borderRadius: BorderRadius.circular(99)), padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4), child: Text(presentation.$1, style: TextStyle(color: presentation.$2, fontWeight: FontWeight.w700, fontSize: 12))));
  }
}
