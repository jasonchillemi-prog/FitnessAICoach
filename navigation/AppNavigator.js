import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { onAuthStateChanged } from 'firebase/auth';
import Purchases from 'react-native-purchases';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { loadUserData as loadCachedUserData } from '../src/utils/offlineCache';
import SignupScreen from '../screens/SignupScreen';
import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProgressScreen from '../screens/ProgressScreen';
import CoachScreen from '../screens/CoachScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import RecipeScreen from '../screens/RecipeScreen';
import PaywallScreen from '../screens/PaywallScreen';
import StoreScreen from '../screens/StoreScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#333333',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarActiveTintColor: '#00ff88',
        tabBarInactiveTintColor: '#888888',
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Dashboard', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text> }} />
      <Tab.Screen name="Progress" component={ProgressScreen} options={{ tabBarLabel: 'Progress', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📈</Text> }} />
      <Tab.Screen name="Coach" component={CoachScreen} options={{ tabBarLabel: 'AI Coach', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🤖</Text> }} />
      <Tab.Screen name="Store" component={StoreScreen} options={{ tabBarLabel: 'Store', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🛒</Text> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          await Purchases.logIn(currentUser.uid);
        } catch (e) {
          console.log('RevenueCat logIn error:', e);
        }

        let profileFound = false;

        // Try Firestore first
        try {
          const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
          if (docSnap.exists() && docSnap.data().weight) {
            profileFound = true;
          }
        } catch (e) {
          // Firestore unavailable (offline) — fall back to local cache
          console.log('AppNavigator: Firestore unavailable, checking cache');
          const cached = await loadCachedUserData();
          if (cached && cached.weight) {
            profileFound = true;
          }
        }

        setHasProfile(profileFound);
        setUser(currentUser);
      } else {
        try {
          await Purchases.logOut();
        } catch (e) {
          console.log('RevenueCat logOut error:', e);
        }
        setUser(null);
        setHasProfile(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#00ff88" />
      </View>
    );
  }

  const getInitialRoute = () => {
    if (!user) return 'Login';
    if (!hasProfile) return 'Onboarding';
    return 'Main';
  };

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={getInitialRoute()} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Recipe" component={RecipeScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
