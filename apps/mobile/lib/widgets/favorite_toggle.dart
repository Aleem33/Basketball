import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/providers.dart';

enum FavoriteKind { team, tournament }

class FavoriteToggle extends ConsumerStatefulWidget {
  const FavoriteToggle({required this.id, required this.kind, super.key});
  final String id;
  final FavoriteKind kind;

  @override
  ConsumerState<FavoriteToggle> createState() => _FavoriteToggleState();
}

class _FavoriteToggleState extends ConsumerState<FavoriteToggle> {
  bool _favorite = false;
  bool _busy = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (ref.read(authControllerProvider).valueOrNull == null) {
      if (mounted) setState(() => _busy = false);
      return;
    }
    try {
      final state = await ref.read(favoritesRepositoryProvider).fetch();
      if (mounted) {
        setState(() {
          _favorite = widget.kind == FavoriteKind.team
              ? state.teamIds.contains(widget.id)
              : state.tournamentIds.contains(widget.id);
          _busy = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _toggle() async {
    if (ref.read(authControllerProvider).valueOrNull == null) {
      context.push('/login');
      return;
    }
    setState(() => _busy = true);
    final bool next = !_favorite;
    try {
      final repository = ref.read(favoritesRepositoryProvider);
      if (widget.kind == FavoriteKind.team) {
        await repository.setTeam(widget.id, next);
      } else {
        await repository.setTournament(widget.id, next);
      }
      if (mounted) setState(() => _favorite = next);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: _favorite ? 'Remove favorite' : 'Add favorite',
    onPressed: _busy ? null : _toggle,
    icon: Icon(_favorite ? Icons.star : Icons.star_border),
  );
}
