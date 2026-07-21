import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/providers.dart';
import '../repositories/auth_repository.dart';
import '../repositories/favorites_repository.dart';
import '../theme/courtside_theme.dart';
import '../widgets/sports_ui.dart';
import '../widgets/states.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();
  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final AsyncValue<AuthUser?> state = ref.watch(authControllerProvider);
    ref.listen(authControllerProvider, (
      AsyncValue<AuthUser?>? previous,
      AsyncValue<AuthUser?> next,
    ) {
      if (next.valueOrNull != null) context.go('/favorites');
    });
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: <Widget>[
            Center(
              child: Container(
                width: 74,
                height: 74,
                decoration: BoxDecoration(
                  color: Theme.of(
                    context,
                  ).colorScheme.primary.withValues(alpha: .12),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.sports_basketball_rounded,
                  size: 38,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Personalize your experience',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            const Text(
              'An account is needed for favorites, alerts, and account controls. Public browsing remains available without signing in.',
            ),
            const SizedBox(height: 24),
            if (state.hasError)
              const MaterialBanner(
                content: Text(
                  'Email or password is incorrect, or the account is unavailable.',
                ),
                actions: <Widget>[],
              ),
            Form(
              key: _formKey,
              child: Column(
                children: <Widget>[
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const <String>[AutofillHints.username],
                    decoration: const InputDecoration(
                      labelText: 'Email address',
                      border: OutlineInputBorder(),
                    ),
                    validator:
                        (String? value) =>
                            value != null && value.contains('@')
                                ? null
                                : 'Enter a valid email address',
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _password,
                    obscureText: true,
                    autofillHints: const <String>[AutofillHints.password],
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      border: OutlineInputBorder(),
                    ),
                    validator:
                        (String? value) =>
                            value == null || value.isEmpty
                                ? 'Password is required'
                                : null,
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed:
                          state.isLoading
                              ? null
                              : () async {
                                if (_formKey.currentState!.validate()) {
                                  await ref
                                      .read(authControllerProvider.notifier)
                                      .login(
                                        _email.text.trim(),
                                        _password.text,
                                      );
                                }
                              },
                      child: Text(state.isLoading ? 'Signing in…' : 'Sign in'),
                    ),
                  ),
                  TextButton(
                    onPressed: () async {
                      await context.push('/register');
                    },
                    child: const Text('Create account'),
                  ),
                  TextButton(
                    onPressed: () async {
                      await context.push('/forgot-password');
                    },
                    child: const Text('Forgot password?'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});
  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final GlobalKey<FormState> _form = GlobalKey<FormState>();
  final TextEditingController _name = TextEditingController();
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();
  bool _busy = false;
  bool _accepted = false;
  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Create account')),
    body: ListView(
      padding: const EdgeInsets.all(24),
      children: <Widget>[
        Form(
          key: _form,
          child: Column(
            children: <Widget>[
              TextFormField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Display name'),
                validator:
                    (String? value) =>
                        (value?.trim().length ?? 0) >= 2
                            ? null
                            : 'Enter your name',
              ),
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email address'),
                validator:
                    (String? value) =>
                        value?.contains('@') == true
                            ? null
                            : 'Enter a valid email',
              ),
              TextFormField(
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  helperText:
                      'At least 12 characters with uppercase, lowercase, and a number',
                ),
                validator:
                    (String? value) =>
                        value != null &&
                                value.length >= 12 &&
                                RegExp('[A-Z]').hasMatch(value) &&
                                RegExp('[a-z]').hasMatch(value) &&
                                RegExp('[0-9]').hasMatch(value)
                            ? null
                            : 'Password does not meet the requirements',
              ),
              CheckboxListTile(
                value: _accepted,
                onChanged:
                    (bool? value) => setState(() => _accepted = value ?? false),
                title: const Text(
                  'I agree to the configured terms and privacy notice',
                ),
                controlAffinity: ListTileControlAffinity.leading,
              ),
              FilledButton(
                onPressed:
                    _busy || !_accepted
                        ? null
                        : () async {
                          if (!_form.currentState!.validate()) return;
                          setState(() => _busy = true);
                          try {
                            await ref
                                .read(authRepositoryProvider)
                                .register(
                                  _email.text.trim(),
                                  _password.text,
                                  _name.text.trim(),
                                );
                            if (context.mounted) {
                              await showDialog<void>(
                                context: context,
                                builder:
                                    (_) => AlertDialog(
                                      title: const Text('Check your email'),
                                      content: const Text(
                                        'Use the verification link before signing in.',
                                      ),
                                      actions: <Widget>[
                                        TextButton(
                                          onPressed: () {
                                            Navigator.pop(context);
                                            context.go('/login');
                                          },
                                          child: const Text('Done'),
                                        ),
                                      ],
                                    ),
                              );
                            }
                          } finally {
                            if (mounted) setState(() => _busy = false);
                          }
                        },
                child: Text(_busy ? 'Creating…' : 'Create account'),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final TextEditingController _email = TextEditingController();
  bool _sent = false;
  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Reset password')),
    body: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: <Widget>[
          if (_sent)
            const Text(
              'If the account is eligible, reset instructions will arrive by email.',
            )
          else ...<Widget>[
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email address'),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () async {
                await ref
                    .read(authRepositoryProvider)
                    .requestPasswordReset(_email.text.trim());
                setState(() => _sent = true);
              },
              child: const Text('Send reset instructions'),
            ),
          ],
        ],
      ),
    ),
  );
}

class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AuthUser? user = ref.watch(authControllerProvider).valueOrNull;
    if (user == null) {
      return const Scaffold(
        body: HonestEmptyState(
          title: 'Sign in for favorites',
          message:
              'Favorites and notification preferences are linked to your account.',
        ),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Favorites')),
      body: FutureBuilder<FavoritesState>(
        future: ref.read(favoritesRepositoryProvider).fetch(),
        initialData: ref.read(favoritesRepositoryProvider).cached(),
        builder: (
          BuildContext context,
          AsyncSnapshot<FavoritesState> snapshot,
        ) {
          final FavoritesState data = snapshot.data ?? const FavoritesState();
          if (data.teamIds.isEmpty && data.tournamentIds.isEmpty) {
            return const HonestEmptyState(
              title: 'No favorites yet',
              message:
                  'Follow teams and save tournaments from their public pages.',
            );
          }
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 112),
            children: <Widget>[
              if (data.isOffline) const OfflineBanner(),
              const SectionHeader('Your collection'),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.groups_2_outlined),
                  title: Text('${data.teamIds.length} followed teams'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                ),
              ),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.emoji_events_outlined),
                  title: Text('${data.tournamentIds.length} saved tournaments'),
                  trailing: const Icon(Icons.chevron_right_rounded),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appConfigProvider);
    final AuthUser? user = ref.watch(authControllerProvider).valueOrNull;
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 112),
        children: <Widget>[
          Card(
            color: CourtsideColors.surfaceHigh,
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: CourtsideColors.background,
                child: const Icon(Icons.sports_basketball_rounded),
              ),
              title: Text(config.appName),
              subtitle: Text('Version ${config.appVersion}'),
            ),
          ),
          const SectionHeader('Preferences & support'),
          if (config.privacyPolicyUrl != null)
            ListTile(
              leading: const Icon(Icons.privacy_tip_outlined),
              title: const Text('Privacy policy'),
              subtitle: Text(config.privacyPolicyUrl.toString()),
            ),
          if (config.termsUrl != null)
            ListTile(
              leading: const Icon(Icons.description_outlined),
              title: const Text('Terms'),
              subtitle: Text(config.termsUrl.toString()),
            ),
          if (config.supportEmail.isNotEmpty)
            ListTile(
              leading: const Icon(Icons.support_agent),
              title: const Text('Support'),
              subtitle: Text(config.supportEmail),
            ),
          const Divider(),
          if (user == null)
            ListTile(
              leading: const Icon(Icons.login),
              title: const Text('Sign in'),
              onTap: () async {
                await context.push('/login');
              },
            )
          else ...<Widget>[
            ListTile(
              leading: const Icon(Icons.person_outline),
              title: Text(user.displayName),
              subtitle: Text(user.email),
            ),
            ListTile(
              leading: const Icon(Icons.notifications_outlined),
              title: const Text('Notification preferences'),
              onTap: () async {
                await context.push('/notification-preferences');
              },
            ),
            ListTile(
              leading: const Icon(Icons.download_outlined),
              title: const Text('Request my data export'),
              onTap: () async {
                final String id =
                    await ref.read(authRepositoryProvider).requestDataExport();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Export request accepted: $id')),
                  );
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline),
              title: const Text('Request account deletion'),
              onTap: () async {
                final bool confirmed =
                    await showDialog<bool>(
                      context: context,
                      builder:
                          (BuildContext context) => AlertDialog(
                            title: const Text('Request account deletion?'),
                            content: const Text(
                              'This signs you out and queues controlled deletion under the configured retention policy.',
                            ),
                            actions: <Widget>[
                              TextButton(
                                onPressed: () => Navigator.pop(context, false),
                                child: const Text('Cancel'),
                              ),
                              FilledButton(
                                onPressed: () => Navigator.pop(context, true),
                                child: const Text('Request deletion'),
                              ),
                            ],
                          ),
                    ) ??
                    false;
                if (confirmed) {
                  await ref
                      .read(authRepositoryProvider)
                      .requestAccountDeletion();
                  await ref.read(authControllerProvider.notifier).logout();
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Sign out'),
              onTap: () async {
                await ref.read(authControllerProvider.notifier).logout();
              },
            ),
          ],
        ],
      ),
    );
  }
}

class NotificationPreferencesScreen extends ConsumerStatefulWidget {
  const NotificationPreferencesScreen({super.key});
  @override
  ConsumerState<NotificationPreferencesScreen> createState() =>
      _NotificationPreferencesScreenState();
}

class _NotificationPreferencesScreenState
    extends ConsumerState<NotificationPreferencesScreen> {
  bool _email = true;
  bool _push = true;
  bool _consented = false;
  bool _busy = false;
  String _type = 'FINAL_RESULT';

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Notification preferences')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        DropdownButtonFormField<String>(
          value: _type,
          decoration: const InputDecoration(labelText: 'Notification type'),
          items:
              const <String>[
                    'GAME_STARTING_SOON',
                    'GAME_STARTED',
                    'PERIOD_ENDED',
                    'FINAL_RESULT',
                    'SCHEDULE_CHANGED',
                    'VENUE_CHANGED',
                    'GAME_POSTPONED',
                    'GAME_CANCELLED',
                    'ROSTER_APPROVED',
                    'ROSTER_CORRECTIONS_REQUESTED',
                    'TOURNAMENT_ANNOUNCEMENT',
                  ]
                  .map(
                    (String value) => DropdownMenuItem<String>(
                      value: value,
                      child: Text(value.replaceAll('_', ' ')),
                    ),
                  )
                  .toList(),
          onChanged: (String? value) => setState(() => _type = value ?? _type),
        ),
        SwitchListTile(
          title: const Text('Email'),
          value: _email,
          onChanged: (bool value) => setState(() => _email = value),
        ),
        SwitchListTile(
          title: const Text('Push'),
          subtitle: const Text(
            'Remote delivery depends on the configured provider transport.',
          ),
          value: _push,
          onChanged: (bool value) => setState(() => _push = value),
        ),
        CheckboxListTile(
          title: const Text('I consent to these notification settings'),
          value: _consented,
          onChanged:
              (bool? value) => setState(() => _consented = value ?? false),
        ),
        FilledButton(
          onPressed:
              _busy || !_consented
                  ? null
                  : () async {
                    setState(() => _busy = true);
                    try {
                      await ref
                          .read(authRepositoryProvider)
                          .saveNotificationPreference(
                            type: _type,
                            emailEnabled: _email,
                            pushEnabled: _push,
                            consented: _consented,
                          );
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Notification preference saved.'),
                          ),
                        );
                      }
                    } finally {
                      if (mounted) setState(() => _busy = false);
                    }
                  },
          child: Text(_busy ? 'Saving…' : 'Save preference'),
        ),
      ],
    ),
  );
}
