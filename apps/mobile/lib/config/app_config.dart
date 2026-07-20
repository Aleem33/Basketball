import 'package:flutter/material.dart';

@immutable
class AppConfig {
  const AppConfig({
    required this.apiUrl,
    required this.websocketUrl,
    required this.appName,
    required this.primaryColor,
    required this.supportEmail,
    required this.privacyPolicyUrl,
    required this.termsUrl,
    required this.deepLinkScheme,
    required this.appVersion,
  });

  factory AppConfig.fromEnvironment() {
    const String apiUrl = String.fromEnvironment(
      'API_URL',
      defaultValue: 'http://localhost:4000/api/v1',
    );
    const String websocketUrl = String.fromEnvironment(
      'WEBSOCKET_URL',
      defaultValue: 'http://localhost:4000/live',
    );
    const String appName = String.fromEnvironment(
      'APP_NAME',
      defaultValue: 'Tournament Platform',
    );
    const String primaryHex = String.fromEnvironment(
      'PRIMARY_COLOR',
      defaultValue: '174A7E',
    );
    return AppConfig(
      apiUrl: Uri.parse(apiUrl),
      websocketUrl: Uri.parse(websocketUrl),
      appName: appName,
      primaryColor: Color(int.parse('FF$primaryHex', radix: 16)),
      supportEmail: const String.fromEnvironment('SUPPORT_EMAIL'),
      privacyPolicyUrl: Uri.tryParse(
        const String.fromEnvironment('PRIVACY_POLICY_URL'),
      ),
      termsUrl: Uri.tryParse(const String.fromEnvironment('TERMS_URL')),
      deepLinkScheme: const String.fromEnvironment(
        'DEEP_LINK_SCHEME',
        defaultValue: 'tournament',
      ),
      appVersion: const String.fromEnvironment(
        'APP_VERSION',
        defaultValue: '1.0.0',
      ),
    );
  }

  final Uri apiUrl;
  final Uri websocketUrl;
  final String appName;
  final Color primaryColor;
  final String supportEmail;
  final Uri? privacyPolicyUrl;
  final Uri? termsUrl;
  final String deepLinkScheme;
  final String appVersion;
}
