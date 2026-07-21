import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../theme/courtside_theme.dart';

class HonestEmptyState extends StatelessWidget {
  const HonestEmptyState({
    required this.title,
    required this.message,
    this.icon = Icons.sports_basketball_outlined,
    super.key,
  });
  final String title;
  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Container(
            width: 76,
            height: 76,
            decoration: BoxDecoration(
              color: Theme.of(
                context,
              ).colorScheme.primary.withValues(alpha: .1),
              shape: BoxShape.circle,
              border: Border.all(
                color: Theme.of(
                  context,
                ).colorScheme.primary.withValues(alpha: .25),
              ),
            ),
            child: Icon(
              icon,
              size: 36,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 7),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 320),
            child: Text(
              message,
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    ),
  );
}

class FailureState extends StatelessWidget {
  const FailureState({required this.error, required this.onRetry, super.key});
  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final String message =
        error is AppFailure
            ? (error as AppFailure).message
            : 'Something went wrong. Try again.';
    final bool offline = error is NetworkFailure;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Icon(
                  offline
                      ? Icons.wifi_off_rounded
                      : Icons.sports_basketball_outlined,
                  size: 44,
                  color: CourtsideColors.live,
                ),
                const SizedBox(height: 14),
                Text(
                  offline ? 'You’re offline' : 'Dropped possession',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 7),
                Text(message, textAlign: TextAlign.center),
                const SizedBox(height: 18),
                FilledButton.tonalIcon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Try again'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});
  @override
  Widget build(BuildContext context) => MaterialBanner(
    backgroundColor: CourtsideColors.warning.withValues(alpha: .12),
    content: const Text('Showing saved information. It may be out of date.'),
    leading: const Icon(
      Icons.cloud_off_outlined,
      color: CourtsideColors.warning,
    ),
    actions: <Widget>[
      TextButton(
        onPressed: ScaffoldMessenger.of(context).hideCurrentMaterialBanner,
        child: const Text('Dismiss'),
      ),
    ],
  );
}
