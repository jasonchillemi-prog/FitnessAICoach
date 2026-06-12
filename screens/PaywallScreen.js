import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView
} from 'react-native';
import Purchases from 'react-native-purchases';

const INTERNAL_TEST_PAYWALL = false;

export default function PaywallScreen({ navigation }) {
  const [offerings, setOfferings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  async function loadOfferings() {
    try {
      const result = await Purchases.getOfferings();
      if (result.current) {
        setOfferings(result.current);
      }
    } catch (e) {
      console.log('PaywallScreen loadOfferings error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(packageItem) {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageItem);
      if (customerInfo.entitlements.active['pro']) {
        Alert.alert('Welcome to Pro! 🎉', 'You now have full access to KineticIQ Pro.', [
          { text: 'Let\'s go!', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (e) {
      if (!e.userCancelled) {
        Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setPurchasing(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (customerInfo.entitlements.active['pro']) {
        Alert.alert('Restored! ✅', 'Your Pro subscription has been restored.', [
          { text: 'Continue', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('No Purchase Found', 'We could not find an active Pro subscription to restore.');
      }
    } catch (e) {
      Alert.alert('Restore Failed', 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  }

  function handleTestActivate() {
    if (!INTERNAL_TEST_PAYWALL) return;
    Alert.alert('Test Mode', 'Activate Pro (Test)?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Activate', onPress: () => navigation.goBack() }
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00ff88" />
      </View>
    );
  }

  const monthlyPackage = offerings?.availablePackages?.find(
    p => p.packageType === 'MONTHLY'
  );
  const yearlyPackage = offerings?.availablePackages?.find(
    p => p.packageType === 'ANNUAL'
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0a0a0a' }}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>KineticIQ Pro</Text>
      <Text style={styles.subtitle}>Unlock everything</Text>

      <View style={styles.featuresContainer}>
        {[
          '🤖 Unlimited AI coaching',
          '🍽️ Full meal planning',
          '🔄 Recipe rotation',
          '💪 Advanced workout plans',
          '🛒 Grocery lists',
          '📈 Progress tracking',
          '⌚ Future wearable features',
        ].map((feature, i) => (
          <Text key={i} style={styles.feature}>{feature}</Text>
        ))}
      </View>

      {monthlyPackage && (
        <TouchableOpacity
          style={styles.packageButton}
          onPress={() => handlePurchase(monthlyPackage)}
          disabled={purchasing}
        >
          <Text style={styles.packageTitle}>Monthly</Text>
          <Text style={styles.packagePrice}>
            {monthlyPackage.product.priceString} / month
          </Text>
        </TouchableOpacity>
      )}

      {yearlyPackage && (
        <TouchableOpacity
          style={[styles.packageButton, styles.yearlyButton]}
          onPress={() => handlePurchase(yearlyPackage)}
          disabled={purchasing}
        >
          <Text style={styles.packageTitle}>Yearly</Text>
          <Text style={styles.packagePrice}>
            {yearlyPackage.product.priceString} / year
          </Text>
          <Text style={styles.savingsBadge}>Best Value</Text>
        </TouchableOpacity>
      )}

      {!loading && !monthlyPackage && !yearlyPackage && (
        <View style={styles.retryContainer}>
          <Text style={styles.retryText}>
            Could not load subscription options.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadOfferings}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {purchasing && (
        <ActivityIndicator
          size="small"
          color="#00ff88"
          style={{ marginTop: 16 }}
        />
      )}

      <TouchableOpacity onPress={handleRestore} disabled={purchasing}>
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>

      <Text style={styles.legalText}>
        Subscriptions auto-renew unless cancelled at least 24 hours before the
        end of the current period. Manage or cancel anytime in your Apple ID
        settings.
      </Text>

      <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
        <Text style={styles.legalLink}>Privacy Policy</Text>
      </TouchableOpacity>

      <Text style={styles.legalLink}>
        <Text
          onPress={() =>
            require('react-native').Linking.openURL(
              'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
            )
          }
        >
          Terms of Use
        </Text>
      </Text>

      {INTERNAL_TEST_PAYWALL && (
        <TouchableOpacity onPress={handleTestActivate}>
          <Text style={styles.testButton}>Activate Pro (Test)</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaaaaa',
    marginBottom: 32,
  },
  featuresContainer: {
    alignSelf: 'stretch',
    marginBottom: 32,
  },
  feature: {
    fontSize: 16,
    color: '#ffffff',
    paddingVertical: 6,
  },
  packageButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#00ff88',
    borderRadius: 12,
    padding: 20,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 12,
  },
  yearlyButton: {
    borderColor: '#00ccff',
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 16,
    color: '#aaaaaa',
  },
  savingsBadge: {
    marginTop: 6,
    fontSize: 12,
    color: '#00ccff',
    fontWeight: 'bold',
  },
  restoreText: {
    color: '#aaaaaa',
    fontSize: 14,
    marginTop: 24,
    textDecorationLine: 'underline',
  },
  legalText: {
    color: '#666666',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 16,
  },
  legalLink: {
    color: '#666666',
    fontSize: 11,
    textDecorationLine: 'underline',
    marginTop: 8,
  },
  testButton: {
    color: '#333333',
    fontSize: 10,
    marginTop: 32,
  },
  retryContainer: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 24,
  },
  retryText: {
    color: '#aaaaaa',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#00ff88',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
