import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../models/domain.dart';
import '../theme/courtside_theme.dart';

class SportsBackdrop extends StatelessWidget {
  const SportsBackdrop({required this.child, super.key});
  final Widget child;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: <Color>[Color(0xFF111827), CourtsideColors.background],
        stops: <double>[0, .38],
      ),
    ),
    child: Stack(
      children: <Widget>[
        const Positioned(top: -110, right: -110, child: _CourtOrb()),
        child,
      ],
    ),
  );
}

class _CourtOrb extends StatelessWidget {
  const _CourtOrb();
  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: Container(
      width: 290,
      height: 290,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: CourtsideColors.orange.withValues(alpha: .12),
        ),
      ),
      child: Center(
        child: Container(
          width: 150,
          height: 150,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: CourtsideColors.orange.withValues(alpha: .08),
            ),
          ),
        ),
      ),
    ),
  );
}

class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, {this.actionLabel, this.onAction, super.key});
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
    child: Row(
      children: <Widget>[
        Container(
          width: 4,
          height: 22,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary,
            borderRadius: BorderRadius.circular(99),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(title, style: Theme.of(context).textTheme.titleLarge),
        ),
        if (actionLabel != null)
          TextButton(onPressed: onAction, child: Text(actionLabel!)),
      ],
    ),
  );
}

class TeamCrest extends StatelessWidget {
  const TeamCrest({required this.team, this.size = 48, super.key});
  final TeamSummary? team;
  final double size;

  String get initials {
    final String name =
        team?.shortName?.trim().isNotEmpty == true
            ? team!.shortName!
            : (team?.name ?? 'TBD');
    return name
        .split(RegExp(r'\s+'))
        .where((String part) => part.isNotEmpty)
        .take(2)
        .map((String part) => part[0])
        .join()
        .toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final Widget fallback = Center(
      child: Text(
        initials,
        style: TextStyle(
          color: CourtsideColors.cream,
          fontSize: size * .28,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
    return Semantics(
      image: true,
      label: '${team?.name ?? 'Team to be decided'} crest',
      child: Container(
        width: size,
        height: size,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: CourtsideColors.surfaceHigh,
          shape: BoxShape.circle,
          border: Border.all(color: CourtsideColors.outline),
        ),
        child:
            team?.logoUrl?.isNotEmpty == true
                ? Image.network(
                  team!.logoUrl!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => fallback,
                )
                : fallback,
      ),
    );
  }
}

class GameStatusBadge extends StatelessWidget {
  const GameStatusBadge(this.status, {super.key});
  final GameStatus status;

  ({String label, Color color}) get presentation => switch (status) {
    GameStatus.live => (label: 'LIVE', color: CourtsideColors.live),
    GameStatus.paused => (label: 'PAUSED', color: CourtsideColors.warning),
    GameStatus.finalScore => (label: 'FINAL', color: CourtsideColors.muted),
    GameStatus.postponed => (
      label: 'POSTPONED',
      color: CourtsideColors.warning,
    ),
    GameStatus.cancelled => (label: 'CANCELLED', color: CourtsideColors.live),
    GameStatus.abandoned => (label: 'ABANDONED', color: CourtsideColors.live),
    GameStatus.forfeited => (label: 'FORFEIT', color: Colors.purpleAccent),
    GameStatus.draft => (label: 'DRAFT', color: CourtsideColors.muted),
    GameStatus.scheduled => (label: 'UPCOMING', color: CourtsideColors.success),
  };

  @override
  Widget build(BuildContext context) {
    final value = presentation;
    return Semantics(
      label: 'Game status ${value.label}',
      liveRegion: status == GameStatus.live,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: value.color.withValues(alpha: .14),
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: value.color.withValues(alpha: .32)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            if (status == GameStatus.live) ...<Widget>[
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: value.color,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
            ],
            Text(
              value.label,
              style: TextStyle(
                color: value.color,
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: .6,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class TournamentCard extends StatelessWidget {
  const TournamentCard(this.tournament, {super.key});
  final TournamentSummary tournament;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 260,
    child: Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => context.push('/tournaments/${tournament.id}'),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(
                Icons.emoji_events_outlined,
                color: Theme.of(context).colorScheme.primary,
              ),
              const Spacer(),
              Text(
                tournament.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                '${DateFormat.MMMd().format(tournament.startsAt.toLocal())} – '
                '${DateFormat.MMMd().format(tournament.endsAt.toLocal())}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 10),
              Text(
                tournament.status.replaceAll('_', ' ').toUpperCase(),
                style: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: .7,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class SkeletonCard extends StatelessWidget {
  const SkeletonCard({this.height = 150, super.key});
  final double height;
  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Loading content',
    child: Container(
      height: height,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: CourtsideColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: CourtsideColors.outline),
      ),
      child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
    ),
  );
}
