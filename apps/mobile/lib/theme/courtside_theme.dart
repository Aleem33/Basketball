import 'package:flutter/material.dart';

abstract final class CourtsideSpacing {
  static const double xs = 6;
  static const double sm = 10;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
}

abstract final class CourtsideRadii {
  static const double small = 12;
  static const double medium = 18;
  static const double large = 24;
  static const double pill = 999;
}

abstract final class CourtsideColors {
  static const Color background = Color(0xFF090D14);
  static const Color surface = Color(0xFF111722);
  static const Color surfaceHigh = Color(0xFF192231);
  static const Color orange = Color(0xFFFF6B1A);
  static const Color orangeSoft = Color(0xFFFF9A57);
  static const Color cream = Color(0xFFF8F2E8);
  static const Color muted = Color(0xFF9DA9B8);
  static const Color outline = Color(0xFF2A3545);
  static const Color live = Color(0xFFFF445E);
  static const Color success = Color(0xFF42D392);
  static const Color warning = Color(0xFFFFB84D);
  static const Color info = Color(0xFF55B8FF);
  static const Color overlay = Color(0xE6111722);
}

abstract final class CourtsideTheme {
  static ThemeData dark(Color tenantColor) {
    final Color accent =
        tenantColor == const Color(0xFF174A7E)
            ? CourtsideColors.orange
            : Color.lerp(CourtsideColors.orange, tenantColor, .18)!;
    final ColorScheme scheme = const ColorScheme.dark(
      surface: CourtsideColors.surface,
      onSurface: CourtsideColors.cream,
      error: CourtsideColors.live,
      onError: Colors.white,
    ).copyWith(
      primary: accent,
      onPrimary: CourtsideColors.background,
      secondary: CourtsideColors.orangeSoft,
      onSecondary: CourtsideColors.background,
      secondaryContainer: CourtsideColors.orange.withValues(alpha: .18),
      onSecondaryContainer: CourtsideColors.orangeSoft,
      tertiary: CourtsideColors.success,
      tertiaryContainer: CourtsideColors.success.withValues(alpha: .16),
      onTertiaryContainer: CourtsideColors.success,
      surfaceContainer: CourtsideColors.surfaceHigh,
      surfaceContainerHigh: const Color(0xFF202B3B),
      outline: CourtsideColors.outline,
      outlineVariant: CourtsideColors.outline.withValues(alpha: .65),
    );

    final TextTheme text = Typography.material2021(
      platform: TargetPlatform.android,
    ).white.apply(
      bodyColor: CourtsideColors.cream,
      displayColor: CourtsideColors.cream,
      fontFamily: 'Roboto',
    );

    return ThemeData(
      brightness: Brightness.dark,
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: CourtsideColors.background,
      canvasColor: CourtsideColors.background,
      textTheme: text.copyWith(
        displayLarge: text.displayLarge?.copyWith(
          fontWeight: FontWeight.w900,
          letterSpacing: -2,
        ),
        displayMedium: text.displayMedium?.copyWith(
          fontWeight: FontWeight.w900,
          letterSpacing: -1.4,
        ),
        displaySmall: text.displaySmall?.copyWith(
          fontWeight: FontWeight.w900,
          letterSpacing: -1,
        ),
        headlineLarge: text.headlineLarge?.copyWith(
          fontWeight: FontWeight.w800,
          letterSpacing: -.7,
        ),
        headlineMedium: text.headlineMedium?.copyWith(
          fontWeight: FontWeight.w800,
          letterSpacing: -.5,
        ),
        headlineSmall: text.headlineSmall?.copyWith(
          fontWeight: FontWeight.w800,
        ),
        titleLarge: text.titleLarge?.copyWith(fontWeight: FontWeight.w800),
        titleMedium: text.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        labelLarge: text.labelLarge?.copyWith(
          fontWeight: FontWeight.w800,
          letterSpacing: .5,
        ),
        bodyMedium: text.bodyMedium?.copyWith(color: CourtsideColors.muted),
        bodySmall: text.bodySmall?.copyWith(color: CourtsideColors.muted),
        labelSmall: text.labelSmall?.copyWith(
          color: CourtsideColors.muted,
          fontWeight: FontWeight.w800,
          letterSpacing: .8,
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: CourtsideColors.cream,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: CourtsideColors.cream,
          fontSize: 22,
          fontWeight: FontWeight.w800,
          letterSpacing: -.4,
        ),
      ),
      cardTheme: CardThemeData(
        color: CourtsideColors.surface,
        elevation: 0,
        margin: const EdgeInsets.symmetric(vertical: 6),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(CourtsideRadii.large),
          side: const BorderSide(color: CourtsideColors.outline),
        ),
        clipBehavior: Clip.antiAlias,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: CourtsideColors.surfaceHigh,
        elevation: 0,
        height: 68,
        indicatorColor: accent.withValues(alpha: .18),
        iconTheme: WidgetStateProperty.resolveWith(
          (Set<WidgetState> states) => IconThemeData(
            color:
                states.contains(WidgetState.selected)
                    ? accent
                    : CourtsideColors.muted,
          ),
        ),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (Set<WidgetState> states) => TextStyle(
            color:
                states.contains(WidgetState.selected)
                    ? CourtsideColors.cream
                    : CourtsideColors.muted,
            fontSize: 11,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: CourtsideColors.surface,
        selectedColor: accent,
        disabledColor: CourtsideColors.surface,
        side: const BorderSide(color: CourtsideColors.outline),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(CourtsideRadii.pill),
        ),
        labelStyle: const TextStyle(
          color: CourtsideColors.cream,
          fontWeight: FontWeight.w800,
        ),
        secondaryLabelStyle: const TextStyle(
          color: CourtsideColors.background,
          fontWeight: FontWeight.w900,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: CourtsideColors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 16,
        ),
        hintStyle: const TextStyle(color: CourtsideColors.muted),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: CourtsideColors.outline),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: CourtsideColors.outline),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: accent, width: 1.5),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(48, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 52),
          side: const BorderSide(color: CourtsideColors.outline),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(minimumSize: const Size(48, 48)),
      ),
      dividerTheme: const DividerThemeData(
        color: CourtsideColors.outline,
        space: 28,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: CourtsideColors.surfaceHigh,
        contentTextStyle: const TextStyle(color: CourtsideColors.cream),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: accent),
      dataTableTheme: DataTableThemeData(
        headingRowColor: WidgetStatePropertyAll(
          accent.withValues(alpha: .12),
        ),
        headingTextStyle: const TextStyle(
          color: CourtsideColors.cream,
          fontWeight: FontWeight.w900,
        ),
        dataTextStyle: const TextStyle(color: CourtsideColors.cream),
        dividerThickness: .6,
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: <TargetPlatform, PageTransitionsBuilder>{
          TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        },
      ),
    );
  }

  static TextStyle scoreStyle(BuildContext context, {double fontSize = 38}) =>
      TextStyle(
        color: CourtsideColors.cream,
        fontSize: fontSize,
        height: .95,
        fontWeight: FontWeight.w900,
        letterSpacing: -1.6,
        fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
      );
}
