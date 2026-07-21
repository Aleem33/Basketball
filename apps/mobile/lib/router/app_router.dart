import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../screens/account_screens.dart';
import '../screens/browse_screen.dart';
import '../screens/detail_screens.dart';
import '../screens/games_screen.dart';
import '../screens/search_screen.dart';
import '../theme/courtside_theme.dart';
import '../widgets/sports_ui.dart';

final GoRouter appRouter = GoRouter(
  routes: <RouteBase>[
    StatefulShellRoute.indexedStack(
      builder:
          (
            BuildContext context,
            GoRouterState state,
            StatefulNavigationShell shell,
          ) => _AppShell(shell),
      branches: <StatefulShellBranch>[
        StatefulShellBranch(
          routes: <RouteBase>[
            GoRoute(path: '/', builder: (_, __) => const BrowseScreen()),
          ],
        ),
        StatefulShellBranch(
          routes: <RouteBase>[
            GoRoute(path: '/games', builder: (_, __) => const GamesScreen()),
          ],
        ),
        StatefulShellBranch(
          routes: <RouteBase>[
            GoRoute(
              path: '/favorites',
              builder: (_, __) => const FavoritesScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: <RouteBase>[
            GoRoute(
              path: '/settings',
              builder: (_, __) => const SettingsScreen(),
            ),
          ],
        ),
      ],
    ),
    GoRoute(path: '/search', builder: (_, __) => const SearchScreen()),
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
    GoRoute(
      path: '/forgot-password',
      builder: (_, __) => const ForgotPasswordScreen(),
    ),
    GoRoute(
      path: '/notification-preferences',
      builder: (_, __) => const NotificationPreferencesScreen(),
    ),
    GoRoute(
      path: '/tournaments/:id',
      builder:
          (_, GoRouterState state) =>
              TournamentDetailScreen(state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/teams/:id',
      builder:
          (_, GoRouterState state) =>
              TeamDetailScreen(state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/games/:id',
      builder:
          (_, GoRouterState state) =>
              GameDetailScreen(state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/stages/:id/standings',
      builder:
          (_, GoRouterState state) =>
              StandingsScreen(state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/stages/:id/bracket',
      builder:
          (_, GoRouterState state) =>
              BracketScreen(state.pathParameters['id']!),
    ),
  ],
  errorBuilder:
      (BuildContext context, GoRouterState state) => Scaffold(
        appBar: AppBar(),
        body: const SportsBackdrop(
          child: Center(
            child: Text('This link is invalid or the content is unavailable.'),
          ),
        ),
      ),
);

class _AppShell extends StatelessWidget {
  const _AppShell(this.shell);
  final StatefulNavigationShell shell;
  @override
  Widget build(BuildContext context) => Scaffold(
    extendBody: true,
    body: shell,
    bottomNavigationBar: SafeArea(
      minimum: const EdgeInsets.fromLTRB(14, 0, 14, 12),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: CourtsideColors.surfaceHigh,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: CourtsideColors.outline),
          boxShadow: const <BoxShadow>[
            BoxShadow(
              color: Colors.black54,
              blurRadius: 24,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: NavigationBar(
            selectedIndex: shell.currentIndex,
            onDestinationSelected:
                (int index) => shell.goBranch(
                  index,
                  initialLocation: index == shell.currentIndex,
                ),
            destinations: const <NavigationDestination>[
              NavigationDestination(
                icon: Icon(Icons.explore_outlined),
                selectedIcon: Icon(Icons.explore),
                label: 'Browse',
              ),
              NavigationDestination(
                icon: Icon(Icons.calendar_month_outlined),
                selectedIcon: Icon(Icons.calendar_month),
                label: 'Games',
              ),
              NavigationDestination(
                icon: Icon(Icons.star_border),
                selectedIcon: Icon(Icons.star),
                label: 'Favorites',
              ),
              NavigationDestination(
                icon: Icon(Icons.settings_outlined),
                selectedIcon: Icon(Icons.settings),
                label: 'Settings',
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
