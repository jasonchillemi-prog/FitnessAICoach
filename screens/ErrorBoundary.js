import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

/**
 * ErrorBoundary — wraps any screen to catch unexpected JS errors.
 *
 * Usage:
 *   import ErrorBoundary from './ErrorBoundary';
 *
 *   export default function SomeScreen() {
 *     return (
 *       <ErrorBoundary screenName="SomeScreen">
 *         <ActualScreenContent />
 *       </ErrorBoundary>
 *     );
 *   }
 *
 * Rate-limit errors (code: 'resource-exhausted') show a friendly message
 * instead of the generic crash UI.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console in dev; swap for Crashlytics / Sentry in production
    console.error(`[ErrorBoundary] ${this.props.screenName || 'Screen'} crashed:`, error, info);
  }

  _reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    const err = this.state.error;

    // ── Rate-limit specific UI ──────────────────────────────────────────────
    const isRateLimit =
      err?.code === 'resource-exhausted' ||
      err?.message?.toLowerCase().includes('daily limit');

    if (isRateLimit) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⏳</Text>
          <Text style={styles.title}>Daily Limit Reached</Text>
          <Text style={styles.message}>
            {err.message || "You've hit your daily limit for this feature. Come back tomorrow!"}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this._reset}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // ── Generic crash UI ───────────────────────────────────────────────────
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Something Went Wrong</Text>
        <Text style={styles.message}>
          An unexpected error occurred{this.props.screenName ? ` in ${this.props.screenName}` : ''}.
          Please try again.
        </Text>
        {__DEV__ && (
          <ScrollView style={styles.devBox}>
            <Text style={styles.devText}>{err?.toString()}</Text>
          </ScrollView>
        )}
        <TouchableOpacity style={styles.button} onPress={this._reset}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    padding: 24,
  },
  icon: {
    fontSize: 52,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#aaaaaa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 300,
  },
  button: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  devBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    maxHeight: 120,
    width: '100%',
    marginBottom: 24,
  },
  devText: {
    color: '#ff6b6b',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});

export default ErrorBoundary;