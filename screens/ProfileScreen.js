import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { auth, db, functions, httpsCallable } from '../firebaseConfig';
import { doc, getDoc, setDoc, collection, query, getDocs, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { clearAll as clearOfflineCache } from '../src/utils/offlineCache';
import ErrorBoundary from './ErrorBoundary';

function ProfileScreenInner({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setUserData(docSnap.data());
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => {
        try {
          await signOut(auth);
          navigation.replace('Login');
        } catch (error) {
          Alert.alert('Error', error.message);
        }
      }}
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'Are you sure? This will permanently delete your account and all your data. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const deleteAccountFn = httpsCallable(functions, 'deleteAccount');
          await deleteAccountFn();
          await clearOfflineCache();
          await signOut(auth); // AppNavigator's onAuthStateChanged handles Purchases.logOut()
          navigation.replace('Login');
        } catch (error) {
          console.log('deleteAccount error:', error);
          Alert.alert('Something went wrong', 'Please try again or contact support.');
        }
      }}
    ]);
  };

  const handleResetPlan = async () => {
    Alert.alert('Reset Plan', 'This will clear your current plan. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        try {
          const user = auth.currentUser;
          await setDoc(doc(db, 'users', user.uid), { 
            savedPlan: null,
            completedWorkouts: {},
            groceryChecked: {}
          }, { merge: true });
          
          // Delete all checkins for this user
          const checkinsRef = collection(db, 'checkins');
          const q = query(checkinsRef);
          const querySnap = await getDocs(q);
          const deletePromises = [];
          querySnap.forEach(docSnap => {
            if (docSnap.id.startsWith(user.uid)) {
              deletePromises.push(deleteDoc(doc(db, 'checkins', docSnap.id)));
            }
          });
          await Promise.all(deletePromises);
          console.log('Deleted checkins:', deletePromises.length);
          Alert.alert('Done!', 'Your plan and progress have been reset. Go to Dashboard to generate a new one.');
        } catch (error) {
          Alert.alert('Error', error.message);
        }
      }}
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00E5A0" />
      </View>
    );
  }

  const getFirstName = () => {
    if (userData?.firstName && userData.firstName.trim()) return userData.firstName.trim();
    const email = auth.currentUser?.email || '';
    return email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{auth.currentUser?.email?.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.profileName}>{getFirstName()}</Text>
        <Text style={styles.profileEmail}>{auth.currentUser?.email}</Text>
        <View style={styles.freeBadge}>
          <Text style={styles.freeBadgeText}>FREE PLAN</Text>
        </View>
      </View>

      {userData && (
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData.weight}</Text>
            <Text style={styles.statLabel}>lbs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData.height}</Text>
            <Text style={styles.statLabel}>height</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData.birthday ? (() => { const p = userData.birthday.split('/'); const bm = parseInt(p[0]); const bd = parseInt(p[1]); const by = parseInt(p[2]); const t = new Date(); let a = t.getFullYear() - by; if (t.getMonth()+1 < bm || (t.getMonth()+1 === bm && t.getDate() < bd)) a--; return a; })() : userData.age}</Text>
            <Text style={styles.statLabel}>years old</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData.workoutsPerWeek}x</Text>
            <Text style={styles.statLabel}>per week</Text>
          </View>
        </View>
      )}

      {userData && userData.goals && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Goals</Text>
          <View style={styles.tagsContainer}>
            {userData.goals.map((goal, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{goal}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {userData && userData.workoutTimes && userData.workoutTimes.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferred Workout Times</Text>
          <View style={styles.tagsContainer}>
            {userData.workoutTimes.map((time, index) => (
              <View key={index} style={[styles.tag, styles.tagBlue]}>
                <Text style={styles.tagText}>{time}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {userData && userData.busyDays && userData.busyDays.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Busy Days</Text>
          <View style={styles.tagsContainer}>
            {userData.busyDays.map((day, index) => (
              <View key={index} style={[styles.tag, styles.tagGray]}>
                <Text style={styles.tagText}>{day}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.settingsCard}>
        <Text style={styles.cardTitle}>Settings</Text>
        <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('EditProfile')}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>✏️</Text>
            <Text style={styles.settingText}>Edit Profile</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow} onPress={handleResetPlan}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🔄</Text>
            <Text style={styles.settingText}>Reset My Plan</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🔔</Text>
            <Text style={styles.settingText}>Notifications</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>📞</Text>
            <Text style={styles.settingText}>Contact Support</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('Sources')}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>📚</Text>
            <Text style={styles.settingText}>Sources & Medical Disclaimer</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('PrivacyPolicy')}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🔒</Text>
            <Text style={styles.settingText}>Privacy Policy</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.proButton} onPress={() => navigation.navigate('Paywall')}>
        <Text style={styles.proButtonText}>⚡ Upgrade to Pro</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleDeleteAccount}>
        <Text style={styles.logoutText}>Delete Account</Text>
      </TouchableOpacity>

      <Text style={styles.version}>KineticIQ v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C10' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: '#080C10', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.5, marginBottom: 24 },
  profileCard: { backgroundColor: '#111820', borderRadius: 14, padding: 24, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,229,160,0.12)', borderWidth: 2, borderColor: 'rgba(0,229,160,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#00E5A0' },
  profileName: { fontSize: 22, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.3, marginBottom: 4 },
  profileEmail: { fontSize: 14, color: '#8A9BB0', marginBottom: 12 },
  freeBadge: { backgroundColor: '#1A2330', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  freeBadgeText: { fontSize: 11, fontWeight: '700', color: '#8A9BB0', letterSpacing: 0.5 },
  statsGrid: { backgroundColor: '#111820', borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#F0F4F8', letterSpacing: -0.3 },
  statLabel: { fontSize: 11, color: '#8A9BB0', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.07)' },
  card: { backgroundColor: '#111820', borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#8A9BB0', letterSpacing: 0.5, marginBottom: 12 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: 'rgba(0,229,160,0.08)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)' },
  tagBlue: { backgroundColor: 'rgba(77,159,255,0.08)', borderColor: 'rgba(77,159,255,0.2)' },
  tagGray: { backgroundColor: '#1A2330', borderColor: 'rgba(255,255,255,0.07)' },
  tagText: { color: '#F0F4F8', fontSize: 13, fontWeight: '500' },
  upgradeCard: { backgroundColor: 'rgba(0,229,160,0.08)', borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  upgradeTitle: { fontSize: 15, fontWeight: '700', color: '#F0F4F8', marginBottom: 4 },
  upgradeSub: { fontSize: 12, color: '#8A9BB0', maxWidth: 200 },
  upgradeButton: { backgroundColor: '#00E5A0', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  upgradeButtonText: { color: '#040A07', fontWeight: '700', fontSize: 14 },
  settingsCard: { backgroundColor: '#111820', borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIcon: { fontSize: 18 },
  settingText: { fontSize: 15, color: '#F0F4F8' },
  settingArrow: { fontSize: 20, color: '#4A5A6A' },
  proButton: { backgroundColor: 'rgba(0,229,160,0.12)', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)' },
  proButtonText: { color: '#00E5A0', fontSize: 16, fontWeight: '700' },
  logoutButton: { backgroundColor: '#111820', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,77,106,0.3)' },
  logoutText: { color: '#FF4D6A', fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', color: '#4A5A6A', fontSize: 12 },
});

export default function ProfileScreen(props) {
  return (
    <ErrorBoundary screenName="ProfileScreen">
      <ProfileScreenInner {...props} />
    </ErrorBoundary>
  );
}
