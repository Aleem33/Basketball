import 'dart:async';

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
  bool get isFinal => <GameStatus>{
    GameStatus.finalScore,
    GameStatus.forfeited,
  }.contains(game.status);

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: _semanticLabel,
    child: Container(
      margin: const EdgeInsets.symmetric(vertical: 7),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(CourtsideRadii.large),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[
            isLive
                ? CourtsideColors.live.withValues(alpha: .22)
                : CourtsideColors.surfaceHigh,
            CourtsideColors.surface,
          ],
        ),
        border: Border.all(
          color:
              isLive
                  ? CourtsideColors.live.withValues(alpha: .5)
                  : CourtsideColors.outline,
        ),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: (isLive ? CourtsideColors.live : Colors.black).withValues(
              alpha: isLive ? .12 : .2,
            ),
            blurRadius: isLive ? 28 : 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => context.push('/games/${game.id}'),
          borderRadius: BorderRadius.circular(CourtsideRadii.large),
          child: Padding(
            padding: EdgeInsets.all(featured ? 20 : 16),
            child: featured ? _featuredContent(context) : _compactContent(context),
          ),
        ),
      ),
    ),
  );

  Widget _featuredContent(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: <Widget>[
      Row(
        children: <Widget>[
          if (isLive) const LivePulseIndicator(),
          if (isLive) const SizedBox(width: 8),
          Text(
            isLive ? 'LIVE NOW' : _eyebrow,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: isLive ? CourtsideColors.live : CourtsideColors.muted,
            ),
          ),
          const Spacer(),
          GameStatusBadge(game.status),
        ],
      ),
      const Spacer(),
      Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: <Widget>[
          Expanded(
            child: _FeaturedTeam(
              team: game.homeTeam,
              score: game.homeScore,
              showScore: showScore,
              winner: isFinal && game.homeScore > game.awayScore,
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            child: Text(
              showScore ? '—' : 'VS',
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: CourtsideColors.muted,
              ),
            ),
          ),
          Expanded(
            child: _FeaturedTeam(
              team: game.awayTeam,
              score: game.awayScore,
              showScore: showScore,
              winner: isFinal && game.awayScore > game.homeScore,
            ),
          ),
        ],
      ),
      const Spacer(),
      _Footer(game: game, isLive: isLive),
    ],
  );

  Widget _compactContent(BuildContext context) => Column(
    children: <Widget>[
      Row(
        children: <Widget>[
          Text(_eyebrow, style: Theme.of(context).textTheme.labelSmall),
          const Spacer(),
          GameStatusBadge(game.status),
        ],
      ),
      const SizedBox(height: 15),
      _CompactTeamRow(
        team: game.homeTeam,
        score: game.homeScore,
        showScore: showScore,
        winner: isFinal && game.homeScore > game.awayScore,
      ),
      const SizedBox(height: 11),
      _CompactTeamRow(
        team: game.awayTeam,
        score: game.awayScore,
        showScore: showScore,
        winner: isFinal && game.awayScore > game.homeScore,
      ),
      const SizedBox(height: 14),
      _Footer(game: game, isLive: isLive),
    ],
  );

  String get _eyebrow => switch (game.status) {
    GameStatus.scheduled || GameStatus.draft => 'NEXT MATCH',
    GameStatus.finalScore || GameStatus.forfeited => 'FULL TIME',
    GameStatus.paused => 'PLAY PAUSED',
    _ => 'MATCH UPDATE',
  };

  String get _semanticLabel {
    final String home = game.homeTeam?.name ?? 'Home team to be decided';
    final String away = game.awayTeam?.name ?? 'Away team to be decided';
    final String score = showScore ? ', $home ${game.homeScore}, $away ${game.awayScore}' : '';
    return '${game.status.name} game, $home versus $away$score';
  }
}

class _FeaturedTeam extends StatelessWidget {
  const _FeaturedTeam({
    required this.team,
    required this.score,
    required this.showScore,
    required this.winner,
  });

  final TeamSummary? team;
  final int score;
  final bool showScore;
  final bool winner;

  @override
  Widget build(BuildContext context) => Column(
    children: <Widget>[
      Stack(
        clipBehavior: Clip.none,
        children: <Widget>[
          TeamCrest(team: team, size: 58),
          if (winner)
            const Positioned(
              right: -3,
              bottom: -3,
              child: Icon(Icons.check_circle, color: CourtsideColors.success, size: 20),
            ),
        ],
      ),
      const SizedBox(height: 9),
      Text(
        team?.shortName ?? team?.name ?? 'TBD',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.titleMedium,
      ),
      const SizedBox(height: 5),
      AnimatedSwitcher(
        duration: MediaQuery.disableAnimationsOf(context)
            ? Duration.zero
            : const Duration(milliseconds: 220),
        child: Text(
          showScore ? '$score' : '—',
          key: ValueKey<Object>(showScore ? score : 'hidden'),
          style: CourtsideTheme.scoreStyle(context, fontSize: 38).copyWith(
            color: winner ? CourtsideColors.cream : null,
          ),
        ),
      ),
    ],
  );
}

class _CompactTeamRow extends StatelessWidget {
  const _CompactTeamRow({
    required this.team,
    required this.score,
    required this.showScore,
    required this.winner,
  });

  final TeamSummary? team;
  final int score;
  final bool showScore;
  final bool winner;

  @override
  Widget build(BuildContext context) => Row(
    children: <Widget>[
      TeamCrest(team: team, size: 42),
      const SizedBox(width: 12),
      Expanded(
        child: Text(
          team?.name ?? 'To be decided',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            color: winner ? CourtsideColors.cream : null,
            fontWeight: winner ? FontWeight.w900 : null,
          ),
        ),
      ),
      if (winner)
        const Padding(
          padding: EdgeInsets.only(right: 8),
          child: Icon(Icons.arrow_left_rounded, color: CourtsideColors.success),
        ),
      Text(
        showScore ? '$score' : '—',
        style: CourtsideTheme.scoreStyle(context, fontSize: 28),
      ),
    ],
  );
}

class _Footer extends StatelessWidget {
  const _Footer({required this.game, required this.isLive});
  final GameSummary game;
  final bool isLive;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.only(top: 12),
    decoration: const BoxDecoration(
      border: Border(top: BorderSide(color: CourtsideColors.outline)),
    ),
    child: Row(
      children: <Widget>[
        const Icon(Icons.schedule_rounded, size: 16, color: CourtsideColors.muted),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            DateFormat.MMMd().add_jm().format(game.scheduledAt.toLocal()),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
        if (game.currentPeriod > 0)
          Text(
            'PERIOD ${game.currentPeriod}',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: isLive ? CourtsideColors.live : CourtsideColors.muted,
            ),
          ),
        const SizedBox(width: 2),
        const Icon(Icons.chevron_right_rounded, color: CourtsideColors.muted),
      ],
    ),
  );
}

class LivePulseIndicator extends StatefulWidget {
  const LivePulseIndicator({super.key});

  @override
  State<LivePulseIndicator> createState() => _LivePulseIndicatorState();
}

class _LivePulseIndicatorState extends State<LivePulseIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.stop();
      _controller.value = 1;
    } else if (_controller.value == 0) {
      unawaited(_controller.forward());
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FadeTransition(
    opacity: Tween<double>(begin: .45, end: 1).animate(_controller),
    child: Container(
      width: 8,
      height: 8,
      decoration: const BoxDecoration(color: CourtsideColors.live, shape: BoxShape.circle),
    ),
  );
}
