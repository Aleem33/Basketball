import 'dart:async';

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
        colors: <Color>[Color(0xFF151D2B), CourtsideColors.background],
        stops: <double>[0, .42],
      ),
    ),
    child: Stack(
      children: <Widget>[
        const Positioned(top: -110, right: -110, child: _CourtOrb()),
        const Positioned(top: 310, left: -190, child: _CourtOrb(size: 330)),
        child,
      ],
    ),
  );
}

class _CourtOrb extends StatelessWidget {
  const _CourtOrb({this.size = 290});
  final double size;
  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: Container(
      width: size,
      height: size,
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

class SportsPageHeader extends StatelessWidget {
  const SportsPageHeader({
    required this.eyebrow,
    required this.title,
    this.subtitle,
    this.trailing,
    super.key,
  });

  final String eyebrow;
  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                eyebrow.toUpperCase(),
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
              const SizedBox(height: 5),
              Text(title, style: Theme.of(context).textTheme.headlineMedium),
              if (subtitle != null) ...<Widget>[
                const SizedBox(height: 7),
                Text(subtitle!, style: Theme.of(context).textTheme.bodyMedium),
              ],
            ],
          ),
        ),
        if (trailing != null) trailing!,
      ],
    ),
  );
}

class PremiumPanel extends StatelessWidget {
  const PremiumPanel({required this.child, this.padding = const EdgeInsets.all(18), super.key});
  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) => Container(
    padding: padding,
    decoration: BoxDecoration(
      color: CourtsideColors.surface.withValues(alpha: .92),
      borderRadius: BorderRadius.circular(CourtsideRadii.large),
      border: Border.all(color: CourtsideColors.outline),
      boxShadow: <BoxShadow>[
        BoxShadow(
          color: Colors.black.withValues(alpha: .18),
          blurRadius: 22,
          offset: const Offset(0, 10),
        ),
      ],
    ),
    child: child,
  );
}

class AnnouncementCarousel extends StatefulWidget {
  const AnnouncementCarousel({required this.announcements, super.key});
  final List<AnnouncementSummary> announcements;

  @override
  State<AnnouncementCarousel> createState() => _AnnouncementCarouselState();
}

class _AnnouncementCarouselState extends State<AnnouncementCarousel>
    with WidgetsBindingObserver {
  final PageController _controller = PageController();
  Timer? _timer;
  int _page = 0;
  bool _paused = false;

  bool get _canRotate => widget.announcements.length > 1 && !_paused;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _restartTimer();
  }

  @override
  void didUpdateWidget(covariant AnnouncementCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_page >= widget.announcements.length) _page = 0;
    _restartTimer();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _restartTimer();
    } else {
      _timer?.cancel();
    }
  }

  void _restartTimer() {
    _timer?.cancel();
    if (!_canRotate || MediaQuery.disableAnimationsOf(context)) return;
    _timer = Timer(const Duration(seconds: 6), _advance);
  }

  void _advance() {
    if (!_controller.hasClients || widget.announcements.isEmpty) return;
    final int next = (_page + 1) % widget.announcements.length;
    unawaited(
      _controller.animateToPage(
        next,
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOutCubic,
      ),
    );
  }

  void _togglePaused() {
    setState(() => _paused = !_paused);
    _restartTimer();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.announcements.isEmpty) return const SizedBox.shrink();
    final double textScale = MediaQuery.textScalerOf(context)
        .scale(1)
        .clamp(1.0, 2.0)
        .toDouble();
    return Semantics(
      container: true,
      label: 'Announcements',
      child: Column(
        children: <Widget>[
          SizedBox(
            height: 156 + ((textScale - 1) * 58),
            child: PageView.builder(
              controller: _controller,
              itemCount: widget.announcements.length,
              onPageChanged: (int value) {
                setState(() => _page = value);
                _restartTimer();
              },
              itemBuilder: (BuildContext context, int index) =>
                  _AnnouncementCard(widget.announcements[index]),
            ),
          ),
          if (widget.announcements.length > 1)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 0),
              child: Row(
                children: <Widget>[
                  Expanded(
                    child:
                        widget.announcements.length <= 8
                            ? Row(
                              children: List<Widget>.generate(
                                widget.announcements.length,
                                (int index) => AnimatedContainer(
                                  duration: const Duration(milliseconds: 180),
                                  width: index == _page ? 22 : 6,
                                  height: 6,
                                  margin: const EdgeInsets.only(right: 6),
                                  decoration: BoxDecoration(
                                    color:
                                        index == _page
                                            ? Theme.of(context).colorScheme.primary
                                            : CourtsideColors.outline,
                                    borderRadius: BorderRadius.circular(99),
                                  ),
                                ),
                              ),
                            )
                            : Text(
                              '${_page + 1} / ${widget.announcements.length}',
                              style: Theme.of(context).textTheme.labelSmall,
                            ),
                  ),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    tooltip: _paused ? 'Resume announcements' : 'Pause announcements',
                    onPressed: _togglePaused,
                    icon: Icon(_paused ? Icons.play_arrow_rounded : Icons.pause_rounded),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _AnnouncementCard extends StatelessWidget {
  const _AnnouncementCard(this.announcement);
  final AnnouncementSummary announcement;

  @override
  Widget build(BuildContext context) {
    final bool linked = announcement.tournamentId != null;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(CourtsideRadii.large),
          gradient: LinearGradient(
            colors: <Color>[
              Theme.of(context).colorScheme.primary.withValues(alpha: .28),
              CourtsideColors.surfaceHigh,
            ],
          ),
          border: Border.all(
            color: Theme.of(context).colorScheme.primary.withValues(alpha: .38),
          ),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap:
                linked
                    ? () => context.push('/tournaments/${announcement.tournamentId}')
                    : null,
            borderRadius: BorderRadius.circular(CourtsideRadii.large),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Row(
                children: <Widget>[
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primary,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.campaign_rounded, color: CourtsideColors.background),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('ANNOUNCEMENT', style: Theme.of(context).textTheme.labelSmall),
                        const SizedBox(height: 5),
                        Text(
                          announcement.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          announcement.body,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  if (linked) const Icon(Icons.chevron_right_rounded),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, {this.actionLabel, this.onAction, super.key});
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 24, 16, 10),
    child: Row(
      children: <Widget>[
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
          borderRadius: BorderRadius.circular(size * .32),
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
          borderRadius: BorderRadius.circular(CourtsideRadii.pill),
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
    width: 272,
    child: Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[CourtsideColors.surfaceHigh, CourtsideColors.surface],
        ),
        borderRadius: BorderRadius.circular(CourtsideRadii.large),
        border: Border.all(color: CourtsideColors.outline),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
        borderRadius: BorderRadius.circular(CourtsideRadii.large),
        onTap: () => context.push('/tournaments/${tournament.id}'),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                children: <Widget>[
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primary.withValues(alpha: .13),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      Icons.emoji_events_rounded,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  const Spacer(),
                  const Icon(Icons.arrow_outward_rounded, color: CourtsideColors.muted),
                ],
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
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(CourtsideRadii.pill),
                ),
                child: Text(
                  tournament.status.replaceAll('_', ' ').toUpperCase(),
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: .7,
                  ),
                ),
              ),
            ],
          ),
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
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            _SkeletonLine(widthFactor: .28, height: 10),
            SizedBox(height: 18),
            _SkeletonLine(widthFactor: .82, height: 18),
            SizedBox(height: 10),
            _SkeletonLine(widthFactor: .62, height: 14),
          ],
        ),
      ),
    ),
  );
}

class _SkeletonLine extends StatelessWidget {
  const _SkeletonLine({required this.widthFactor, required this.height});
  final double widthFactor;
  final double height;

  @override
  Widget build(BuildContext context) => FractionallySizedBox(
    widthFactor: widthFactor,
    child: Container(
      height: height,
      decoration: BoxDecoration(
        color: CourtsideColors.surfaceHigh,
        borderRadius: BorderRadius.circular(99),
      ),
    ),
  );
}
