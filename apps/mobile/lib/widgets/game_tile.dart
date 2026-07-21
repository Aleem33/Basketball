import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../models/domain.dart';
import '../theme/courtside_theme.dart';
import 'sports_ui.dart';

class GameTile extends StatelessWidget {
  const GameTile(this.game, {this.featured = false, super.key});
  final GameSummary game;
  final bool featured;

  bool get showScore => <GameStatus>{
    GameStatus.live,
    GameStatus.paused,
    GameStatus.finalScore,
    GameStatus.forfeited,
    GameStatus.abandoned,
  }.contains(game.status);

  @override
  Widget build(BuildContext context) => Card(
    color:
        game.status == GameStatus.live
            ? CourtsideColors.live.withValues(alpha: .075)
            : null,
    child: InkWell(
      onTap: () => context.push('/games/${game.id}'),
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: EdgeInsets.all(featured ? 20 : 16),
        child: Column(
          children: <Widget>[
            Row(
              children: <Widget>[
                GameStatusBadge(game.status),
                const Spacer(),
                Icon(
                  Icons.schedule,
                  size: 15,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 5),
                Text(
                  DateFormat.MMMd().add_jm().format(game.scheduledAt.toLocal()),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
            SizedBox(height: featured ? 22 : 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: <Widget>[
                Expanded(
                  child: _Team(
                    team: game.homeTeam,
                    score: game.homeScore,
                    showScore: showScore,
                    featured: featured,
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Text(
                    showScore ? '–' : 'VS',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: CourtsideColors.muted,
                    ),
                  ),
                ),
                Expanded(
                  child: _Team(
                    team: game.awayTeam,
                    score: game.awayScore,
                    showScore: showScore,
                    featured: featured,
                  ),
                ),
              ],
            ),
            if (game.status == GameStatus.live &&
                game.currentPeriod > 0) ...<Widget>[
              const SizedBox(height: 14),
              Text(
                'PERIOD ${game.currentPeriod}',
                style: const TextStyle(
                  color: CourtsideColors.live,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: .8,
                ),
              ),
            ],
          ],
        ),
      ),
    ),
  );
}

class _Team extends StatelessWidget {
  const _Team({
    required this.team,
    required this.score,
    required this.showScore,
    required this.featured,
  });
  final TeamSummary? team;
  final int score;
  final bool showScore;
  final bool featured;

  @override
  Widget build(BuildContext context) => Column(
    children: <Widget>[
      TeamCrest(team: team, size: featured ? 58 : 46),
      const SizedBox(height: 9),
      Text(
        team?.shortName ?? team?.name ?? 'TBD',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.titleMedium,
      ),
      if (showScore)
        AnimatedSwitcher(
          duration:
              MediaQuery.disableAnimationsOf(context)
                  ? Duration.zero
                  : const Duration(milliseconds: 240),
          child: Text(
            '$score',
            key: ValueKey<int>(score),
            style: (featured
                    ? Theme.of(context).textTheme.displaySmall
                    : Theme.of(context).textTheme.headlineMedium)
                ?.copyWith(fontWeight: FontWeight.w900),
          ),
        ),
    ],
  );
}
