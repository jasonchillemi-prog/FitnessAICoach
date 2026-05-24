import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { logLogin, logScreenView } from '../src/utils/analytics';
import ErrorBoundary from './ErrorBoundary';

function LoginScreenInner({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await logLogin('email');
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00E5A0" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoK}>K</Text>
          </View>
          <Text style={styles.logoText}>Kinetic<Text style={styles.logoAccent}>IQ</Text></Text>
          <Text style={styles.logoTagline}>Your AI-powered fitness coach</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSub}>Sign in to continue your fitness journey</Text>

          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#4A5A6A"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            ref={passwordRef}
            style={styles.input}
            placeholder="Your password"
            placeholderTextColor="#4A5A6A"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            <Text style={styles.loginButtonText}>Sign In →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.footerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.trustRow}>
          <Text style={styles.trustItem}>🔒 Secure</Text>
          <Text style={styles.trustItem}>🚫 No spam</Text>
          <Text style={styles.trustItem}>⭐ Free to start</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C10' },
  centered: { flex: 1, backgroundColor: '#080C10', alignItems: 'center', justifyContent: 'center' },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(0,229,160,0.12)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoK: { fontSize: 36, fontWeight: '800', color: '#00E5A0' },
  logoImage: { width: 260, height: 180, resizeMode: 'contain', marginBottom: 8 },
  logoText: { fontSize: 32, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.5, marginBottom: 8 },
  logoAccent: { color: '#00E5A0' },
  logoTagline: { fontSize: 14, color: '#8A9BB0' },
  card: { backgroundColor: '#111820', borderRadius: 16, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.3, marginBottom: 6 },
  cardSub: { fontSize: 14, color: '#8A9BB0', marginBottom: 24 },
  label: { fontSize: 11, fontWeight: '700', color: '#8A9BB0', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: '#1A2330', borderRadius: 10, padding: 14, color: '#F0F4F8', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 16 },
  loginButton: { backgroundColor: '#00E5A0', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 4 },
  loginButtonText: { color: '#040A07', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  footerText: { fontSize: 14, color: '#8A9BB0' },
  footerLink: { fontSize: 14, color: '#00E5A0', fontWeight: '600' },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  trustItem: { fontSize: 12, color: '#4A5A6A' },
});

export default function LoginScreen() {
  return (
    <ErrorBoundary screenName="LoginScreen">
      <LoginScreenInner />
    </ErrorBoundary>
  );
}
