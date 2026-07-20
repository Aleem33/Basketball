import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:tournament_mobile/providers/providers.dart';
import 'package:tournament_mobile/repositories/auth_repository.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  test('authentication controller exposes failures without a fake session', () async {
    final MockAuthRepository repository = MockAuthRepository();
    when(() => repository.login('person@example.com', 'invalid')).thenThrow(Exception('denied'));
    final AuthController controller = AuthController(repository);
    await controller.login('person@example.com', 'invalid');
    expect(controller.state.hasError, isTrue);
    expect(controller.state.valueOrNull, isNull);
  });

  test('authentication controller stores an authenticated user in state', () async {
    final MockAuthRepository repository = MockAuthRepository();
    const AuthUser user = AuthUser(id: 'id', email: 'person@example.com', displayName: 'Person');
    when(() => repository.login('person@example.com', 'valid-password')).thenAnswer((_) async => user);
    final AuthController controller = AuthController(repository);
    await controller.login('person@example.com', 'valid-password');
    expect(controller.state.value, same(user));
  });
}
