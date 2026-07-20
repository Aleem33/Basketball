import 'package:flutter/material.dart';
import '../api/api_client.dart';

class HonestEmptyState extends StatelessWidget {
  const HonestEmptyState({
    required this.title,
    required this.message,
    super.key,
  });
  final String title;
  final String message;
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const Icon(Icons.sports_basketball_outlined, size: 44),
          const SizedBox(height: 12),
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            message,
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
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
    final IconData icon =
        error is NetworkFailure
            ? Icons.cloud_off_outlined
            : Icons.error_outline;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(icon, size: 44),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.tonalIcon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }
}

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});
  @override
  Widget build(BuildContext context) => MaterialBanner(
    content: const Text('Showing saved information. It may be out of date.'),
    leading: const Icon(Icons.cloud_off_outlined),
    actions: <Widget>[
      TextButton(
        onPressed: ScaffoldMessenger.of(context).hideCurrentMaterialBanner,
        child: const Text('Dismiss'),
      ),
    ],
  );
}
