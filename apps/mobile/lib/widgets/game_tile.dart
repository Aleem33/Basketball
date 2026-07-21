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

  bool get isLive => game.status == GameStatus.live;

  @override
  Widget build(BuildContext context) {
    final Color glow =
        isLive
            ? CourtsideColors.live
            : game.status == GameStatus.scheduled
            ? CourtsideColors.orange
            : CourtsideColors.outline;
    return Semantics(
      button: true,
      label: _semanticLabel,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 7),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          gradient: LinearGradient(
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
            colors: <Color>[
              CourtsideColors.surfaceHigh,
              glow.withValues(alpha: isLive ? .24 : .10),
            ],
          ),
          border: Border.all(color: glow.withValues(alpha: isLive ? .58 : .26)),
          boxShadow:
              isLive
                  ? <BoxShadow>[
                    BoxShadow(
                      color: CourtsideColors.live.withValues(alpha: .08),
                      blurRadius: 24,
                      offset: const Offset(0, 10),
                    ),
                  ]
                  : null,
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => context.push('/games/${game.id}'),
            borderRadius: BorderRadius.circular(22),
            child: Padding(
              padding: EdgeInsets.all(featured ? 20 : 17),
              child: Column(
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Text(
                        isLive ? 'LIVE MATCH' : 'GAME',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: CourtsideColors.muted,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1,
                        ),
                      ),
                      const Spacer(),
                      GameStatusBadge(game.status),
                    ],
                  ),
                  SizedBox(height: featured ? 20 : 15),
                  _TeamRow(
                    team: game.homeTeam,
                    score: game.homeScore,
                    showScore: showScore,
                    large: featured,
                  ),
                  const SizedBox(height: 12),
                  _TeamRow(
                    team: game.awayTeam,
                    score: game.awayScore,
                    showScore: showScore,
                    large: featured,
                  ),
                  const SizedBox(height: 16),
                  Divider(
                    color: CourtsideColors.outline.withValues(alpha: .75),
                    height: 1,
                  ),
                  const SizedBox(height: 13),
                  Row(
                    children: <Widget>[
                      const Icon(
                        Icons.schedule_rounded,
                        size: 16,
                        color: CourtsideColors.muted,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          DateFormat.MMMd().add_jm().format(
                            game.scheduledAt.toLocal(),
                          ),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                      if (game.currentPeriod > 0)
                        Text(
                          'PERIOD ${game.currentPeriod}',
                          style: TextStyle(
                            color:
                                isLive
                                    ? CourtsideColors.live
                                    : CourtsideColors.muted,
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: .7,
                          ),
                        ),
                      const SizedBox(width: 4),
                      const Icon(
                        Icons.chevron_right_rounded,
                        color: CourtsideColors.muted,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String get _semanticLabel {
    final String home = game.homeTeam?.name ?? 'Home team to be decided';
    final String away = game.awayTeam?.name ?? 'Away team to be decided';
    final String score =
        showScore ? ', $home ${game.homeScore}, $away ${game.awayScore}' : '';
    return '${game.status.name} game, $home versus $away$score';
  }
}

class _TeamRow extends StatelessWidget {
  const _TeamRow({
    required this.team,
    required this.score,
    required this.showScore,
    required this.large,
  });

  final TeamSummary? team;
  final int score;
  final bool showScore;
  final bool large;

  @override
  Widget build(BuildContext context) => Row(
    children: <Widget>[
      TeamCrest(team: team, size: large ? 50 : 44),
      const SizedBox(width: 13),
      Expanded(
        child: Text(
          team?.name ?? 'To be decided',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.titleMedium,
        ),
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
            style: (large
                    ? Theme.of(context).textTheme.headlineLarge
                    : Theme.of(context).textTheme.headlineMedium)
                ?.copyWith(fontWeight: FontWeight.w900),
          ),
        )
      else
        Text(
          'VS',
          style: Theme.of(
            context,
          ).textTheme.labelLarge?.copyWith(color: CourtsideColors.muted),
        ),
    ],
  );
}
