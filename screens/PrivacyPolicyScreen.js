import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import ErrorBoundary from './ErrorBoundary';

function PrivacyPolicyScreenInner({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: June 2026</Text>

        <Text style={styles.section}>1. Introduction</Text>
        <Text style={styles.body}>KineticIQ ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.</Text>

        <Text style={styles.section}>2. Information We Collect</Text>
        <Text style={styles.body}>We collect information you provide directly to us during onboarding, including your first name, age, weight, height, fitness goals, dietary preferences, and workout schedule. We also collect data about your use of the app such as completed workouts and grocery list activity.</Text>
        <Text style={[styles.body, { marginTop: 10 }]}>Biological sex. We ask for your biological sex, which is optional, to calculate your personalized calorie and macronutrient targets more accurately. If you prefer not to share this, we use a standard estimate instead. This information is never shared with third parties and is used solely for in-app nutrition calculations.</Text>

        <Text style={styles.section}>3. How We Use Your Information</Text>
        <Text style={styles.body}>We use your information to generate personalized fitness and nutrition plans, provide AI coaching responses, track your progress, and improve our services. Your data is used solely to deliver and improve the KineticIQ experience.</Text>

        <Text style={styles.section}>4. Third-Party Services</Text>
        <Text style={styles.body}>KineticIQ uses the following third-party services:{'\n\n'}• Firebase (Google) — for authentication, data storage, and cloud functions{'\n'}• Anthropic Claude API — for AI-powered coaching and plan generation{'\n'}• Apple HealthKit — optionally, to read step count data{'\n\n'}Each of these services has its own privacy policy. We recommend reviewing them directly.</Text>

        <Text style={styles.section}>5. Data Storage and Security</Text>
        <Text style={styles.body}>Your data is stored securely using Google Firebase with industry-standard encryption. AI requests are processed server-side and your data is never sent directly to third-party AI providers from your device. We do not sell your personal information to any third party.</Text>

        <Text style={styles.section}>6. Data Retention</Text>
        <Text style={styles.body}>We retain your data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us at the email below.</Text>

        <Text style={styles.section}>7. Children's Privacy</Text>
        <Text style={styles.body}>KineticIQ is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us immediately.</Text>

        <Text style={styles.section}>8. Your Rights</Text>
        <Text style={styles.body}>You have the right to access, correct, or delete your personal data at any time. You can edit your profile information within the app or contact us to request full data deletion.</Text>

        <Text style={styles.section}>9. Changes to This Policy</Text>
        <Text style={styles.body}>We may update this Privacy Policy from time to time. We will notify you of any significant changes by updating the date at the top of this page. Continued use of the app after changes constitutes acceptance of the updated policy.</Text>

        <Text style={styles.section}>10. Contact Us</Text>
        <Text style={styles.body}>If you have any questions about this Privacy Policy or your data, please contact us at:{'\n\n'}support@kineticiq.app</Text>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C10' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  back: { color: '#00E5A0', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.5 },
  content: { padding: 20 },
  updated: { fontSize: 12, color: '#4A5A6A', marginBottom: 24 },
  section: { fontSize: 15, fontWeight: '700', color: '#00E5A0', marginTop: 24, marginBottom: 8 },
  body: { fontSize: 14, color: '#8A9BB0', lineHeight: 22 },
  spacer: { height: 40 },
});

export default function PrivacyPolicyScreen(props) {
  return (
    <ErrorBoundary screenName="PrivacyPolicyScreen">
      <PrivacyPolicyScreenInner {...props} />
    </ErrorBoundary>
  );
}
