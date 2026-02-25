import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:finality_app/widgets/empty_state_widget.dart';

void main() {
  group('EmptyStateWidget', () {
    testWidgets('renders icon, title, and subtitle', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: EmptyStateWidget(
              icon: Icons.inbox,
              color: Colors.blue,
              title: 'No items',
              subtitle: 'Pull to refresh',
            ),
          ),
        ),
      );

      expect(find.text('No items'), findsOneWidget);
      expect(find.text('Pull to refresh'), findsOneWidget);
      expect(find.byIcon(Icons.inbox), findsOneWidget);
    });

    testWidgets('shows action button when actionLabel provided', (tester) async {
      var tapped = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: EmptyStateWidget(
              icon: Icons.add,
              color: Colors.green,
              title: 'Empty',
              subtitle: 'Create first item',
              actionLabel: 'Create',
              onAction: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.text('Create'), findsOneWidget);
      await tester.tap(find.text('Create'));
      expect(tapped, isTrue);
    });

    testWidgets('hides action button when no actionLabel', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: EmptyStateWidget(
              icon: Icons.inbox,
              color: Colors.blue,
              title: 'Empty',
              subtitle: 'Nothing here',
            ),
          ),
        ),
      );

      expect(find.byType(FilledButton), findsNothing);
    });
  });
}
