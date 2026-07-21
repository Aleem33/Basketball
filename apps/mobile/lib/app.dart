import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'config/app_config.dart';
import 'providers/providers.dart';
import 'router/app_router.dart';
import 'theme/courtside_theme.dart';

class TournamentApp extends ConsumerWidget {
  const TournamentApp({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AppConfig config = ref.watch(appConfigProvider);
    return MaterialApp.router(
      title: config.appName,
      debugShowCheckedModeBanner: false,
      theme: CourtsideTheme.dark(config.primaryColor),
      darkTheme: CourtsideTheme.dark(config.primaryColor),
      themeMode: ThemeMode.dark,
      routerConfig: appRouter,
    );
  }
}
