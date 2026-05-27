import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import ErrorBoundary from './ErrorBoundary';

const PRO_FEATURES = [
  { icon: '🤖', title: 'Unlimited AI Coaching', desc: 'Ask your coach anything, anytime' },
  { icon: '💪', title: 'Detailed Workout Plans', desc: 'Full exercise breakdowns with instructions' },
  { icon: '🍽️', title: 'Meal Recipes', desc: 'Full recipes for every meal in your plan' },
  { icon: '🎤', title: 'Voice AI Coach', desc: 'Talk to your coach hands-free' },
  { icon: '📊', title: 'Advanced Analytics', desc: 'Deep insights into your progress' },
  { icon: '🔄', title: 'Plan Regeneration', desc: 'Unlimited plan updates and adaptations' },
  { icon: '🛒', title: 'Priority Store Deals', desc: 'Exclusive discounts on supplements' },
  { icon: '📅', title: 'Smart Calendar Sync', desc: 'Automatic schedule optimization' },
];

function PaywallScreenInner({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  const plans = [
    { id: 'monthly', label: 'Monthly', price: '$9.99', period: '/month', savings: null },
    { id: 'yearly', label: 'Yearly', price: '$59.99', period: '/year', savings: 'Save 50%' },
  ];

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      Alert.alert(
        'Coming Soon! 🚀',
        'Payment processing will be available when the app launches on the App Store. Your Pro access has been activated for testing!',
        [{
          text: 'Activate Pro (Test)',
          onPress: async () => {
            await setDoc(doc(db, 'users', user.uid), { isPro: true, proActivatedAt: new Date().toISOString() }, { merge: true });
            Alert.alert('🎉 Pro Activated!', 'You now have full Pro access for testing.');
            navigation.goBack();
          }
        },
        { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.heroSection}>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>⚡ PRO</Text>
          </View>
          <Text style={styles.heroTitle}>Unlock Your Full{'\n'}Fitness Potential</Text>
          <Text style={styles.heroSub}>Join thousands reaching their goals faster with KineticIQ Pro</Text>
        </View>

        <View style={styles.featuresCard}>
          {PRO_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
              <Text style={styles.featureCheck}>✓</Text>
            </View>
          ))}
        </View>

        <View style={styles.plansContainer}>
          {plans.map(plan => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planCard, selectedPlan === plan.id && styles.planCardActive]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              {plan.savings && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsBadgeText}>{plan.savings}</Text>
                </View>
              )}
              <View style={styles.planLeft}>
                <View style={[styles.planRadio, selectedPlan === plan.id && styles.planRadioActive]}>
                  {selectedPlan === plan.id && <View style={styles.planRadioDot} />}
                </View>
                <Text style={[styles.planLabel, selectedPlan === plan.id && styles.planLabelActive]}>{plan.label}</Text>
              </View>
              <View style={styles.planRight}>
                <Text style={[styles.planPrice, selectedPlan === plan.id && styles.planPriceActive]}>{plan.price}</Text>
                <Text style={styles.planPeriod}>{plan.period}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#040A07" />
          ) : (
            <>
              <Text style={styles.subscribeButtonText}>Start Free Trial →</Text>
              <Text style={styles.subscribeButtonSub}>3 days free, then {plans.find(p => p.id === selectedPlan)?.price}{plans.find(p => p.id === selectedPlan)?.period}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>Cancel anytime. No questions asked. Secure payment by Stripe.</Text>

        <View style={styles.socialProof}>
          <Text style={styles.socialProofText}>⭐⭐⭐⭐⭐</Text>
          <Text style={styles.socialProofQuote}>"Lost 20 lbs in 3 months with KineticIQ Pro!"</Text>
          <Text style={styles.socialProofAuthor}>— Sarah M., verified user</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C10' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  closeButton: { position: 'absolute', top: 16, right: 24, width: 32, height: 32, borderRadius: 16, backgroundColor: '#111820', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  closeText: { color: '#8A9BB0', fontSize: 14 },
  heroSection: { alignItems: 'center', marginBottom: 32, marginTop: 20 },
  proBadge: { backgroundColor: 'rgba(0,229,160,0.12)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)', marginBottom: 16 },
  proBadgeText: { color: '#00E5A0', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  heroTitle: { fontSize: 32, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.5, textAlign: 'center', lineHeight: 40, marginBottom: 12 },
  heroSub: { fontSize: 14, color: '#8A9BB0', textAlign: 'center', lineHeight: 20 },
  featuresCard: { backgroundColor: '#111820', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 12 },
  featureIcon: { fontSize: 24, width: 32 },
  featureInfo: { flex: 1 },
  featureTitle: { fontSize: 14, fontWeight: '600', color: '#F0F4F8', marginBottom: 2 },
  featureDesc: { fontSize: 12, color: '#8A9BB0' },
  featureCheck: { color: '#00E5A0', fontWeight: '800', fontSize: 16 },
  plansContainer: { gap: 12, marginBottom: 24 },
  planCard: { backgroundColor: '#111820', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planCardActive: { borderColor: '#00E5A0', backgroundColor: 'rgba(0,229,160,0.08)' },
  savingsBadge: { position: 'absolute', top: -10, right: 12, backgroundColor: '#00E5A0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  savingsBadgeText: { color: '#040A07', fontSize: 11, fontWeight: '800' },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#4A5A6A', alignItems: 'center', justifyContent: 'center' },
  planRadioActive: { borderColor: '#00E5A0' },
  planRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00E5A0' },
  planLabel: { fontSize: 16, fontWeight: '600', color: '#8A9BB0' },
  planLabelActive: { color: '#F0F4F8' },
  planRight: { alignItems: 'flex-end' },
  planPrice: { fontSize: 20, fontWeight: '800', color: '#8A9BB0' },
  planPriceActive: { color: '#00E5A0' },
  planPeriod: { fontSize: 12, color: '#4A5A6A' },
  subscribeButton: { backgroundColor: '#00E5A0', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 16 },
  subscribeButtonText: { color: '#040A07', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  subscribeButtonSub: { color: 'rgba(4,10,7,0.7)', fontSize: 12 },
  disclaimer: { fontSize: 12, color: '#4A5A6A', textAlign: 'center', marginBottom: 24 },
  socialProof: { backgroundColor: '#111820', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  socialProofText: { fontSize: 20, marginBottom: 8 },
  socialProofQuote: { fontSize: 14, color: '#F0F4F8', fontWeight: '600', textAlign: 'center', marginBottom: 6, fontStyle: 'italic' },
  socialProofAuthor: { fontSize: 12, color: '#8A9BB0' },
});

export default function PaywallScreen(props) {
  return (
    <ErrorBoundary screenName="PaywallScreen">
      <PaywallScreenInner {...props} />
    </ErrorBoundary>
  );
}
