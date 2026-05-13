import React, { useState } from 'react';
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
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    Keyboard.dismiss();
    if (!email || !phone || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigation.navigate('Onboarding');
    } catch (error) {
      Alert.alert('Signup Error', error.message);
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Text style={styles.logoK}>K</Text>
            </View>
            <Text style={styles.logoText}>Kinetic<Text style={styles.logoAccent}>IQ</Text></Text>
            <Text style={styles.logoTagline}>Your AI-powered fitness coach</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create your account</Text>
            <Text style={styles.cardSub}>Start free — no credit card required</Text>

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
            />

            <Text style={styles.label}>PHONE NUMBER</Text>
            <TextInput
              style={styles.input}
              placeholder="(555) 000-0000"
              placeholderTextColor="#4A5A6A"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Min. 8 characters"
              placeholderTextColor="#4A5A6A"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Text style={styles.terms}>
              By creating an account you agree to our <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>

            <TouchableOpacity style={styles.signupButton} onPress={handleSignup} disabled={loading}>
              <Text style={styles.signupButtonText}>Create Account & Start Free →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.trustRow}>
            <Text style={styles.trustItem}>🔒 256-bit encrypted</Text>
            <Text style={styles.trustItem}>🚫 No spam</Text>
            <Text style={styles.trustItem}>⭐ Free to start</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C10' },
  centered: { flex: 1, backgroundColor: '#080C10', alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, padding: 24, justifyContent: 'center', paddingTop: 60, paddingBottom: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 72, height: 72, borderRadius: 20, backgroundColor: 'rgba(0,229,160,0.12)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoK: { fontSize: 36, fontWeight: '800', color: '#00E5A0' },
  logoText: { fontSize: 32, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.5, marginBottom: 8 },
  logoAccent: { color: '#00E5A0' },
  logoTagline: { fontSize: 14, color: '#8A9BB0' },
  card: { backgroundColor: '#111820', borderRadius: 16, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.3, marginBottom: 6 },
  cardSub: { fontSize: 14, color: '#8A9BB0', marginBottom: 24 },
  label: { fontSize: 11, fontWeight: '700', color: '#8A9BB0', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: '#1A2330', borderRadius: 10, padding: 14, color: '#F0F4F8', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 16 },
  terms: { fontSize: 12, color: '#8A9BB0', lineHeight: 18, marginBottom: 20 },
  termsLink: { color: '#00E5A0' },
  signupButton: { backgroundColor: '#00E5A0', borderRadius: 10, padding: 16, alignItems: 'center' },
  signupButtonText: { color: '#040A07', fontSize: 15, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  footerText: { fontSize: 14, color: '#8A9BB0' },
  footerLink: { fontSize: 14, color: '#00E5A0', fontWeight: '600' },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' },
  trustItem: { fontSize: 12, color: '#4A5A6A' },
});
