import React, { useState, useCallback, useEffect, useRef } from 'react';
import { isHealthDataAvailable, requestAuthorization, queryStatisticsForQuantity } from '@kingstinct/react-native-healthkit';
import { logScreenView } from '../src/utils/analytics';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { auth, db, functions, httpsCallable } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { requestPermissions, getOrCreateCalendar, addMealsToCalendar, addWorkoutsToCalendar } from '../services/calendarService';
import ErrorBoundary from './ErrorBoundary';
import { savePlan, loadPlan, saveUserData, loadUserData as loadCachedUserData, savePendingWorkouts, loadPendingWorkouts, clearPendingWorkouts, savePendingGrocery, loadPendingGrocery, clearPendingGrocery } from '../src/utils/offlineCache';
import usePro from '../hooks/usePro';

const isRateLimited = (e) =>
  e?.code === 'functions/resource-exhausted' ||
  e?.code === 'resource-exhausted' ||
  /resource|limit/i.test(e?.message);

// buildGroceryList returns {name, amount, unit, ...} objects; format to the
// legacy string shape ("2 lbs chicken breast") so the grocery UI is unchanged
const formatGroceryItems = (items) =>
  (items || []).map((i) => [i.amount, i.unit, i.name].filter(Boolean).join(' '));

const attachGroceryList = async (parsed, previousPlan) => {
  const userItems = previousPlan?.groceryUserItems || [];
  let libraryItems = [];
  if (parsed.mealIdCounts && Object.keys(parsed.mealIdCounts).length > 0) {
    const buildGroceryListFn = httpsCallable(functions, 'buildGroceryList');
    const groceryResult = await buildGroceryListFn({ mealIdCounts: parsed.mealIdCounts });
    libraryItems = formatGroceryItems(groceryResult.data.groceryList);
  }
  parsed.groceryList = [...libraryItems, ...userItems];
  parsed.groceryUserItems = userItems;
};

function CoachBanner({ message }) {
  const [expanded, setExpanded] = useState(false);
  const preview = message.length > 80 ? message.substring(0, 80) + '...' : message;
  return (
    <TouchableOpacity style={bannerStyles.banner} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
      <View style={bannerStyles.bannerLeft}>
        <Text style={bannerStyles.bannerIcon}>💬</Text>
        <View style={bannerStyles.bannerText}>
          <Text style={bannerStyles.bannerTitle}>Coach Says</Text>
          <Text style={bannerStyles.bannerMessage}>{expanded ? message : preview}</Text>
        </View>
      </View>
      <Text style={bannerStyles.bannerArrow}>{expanded ? '▲' : '▼'}</Text>
    </TouchableOpacity>
  );
}

const bannerStyles = StyleSheet.create({
  banner: { backgroundColor: 'rgba(0,229,160,0.08)', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  bannerLeft: { flexDirection: 'row', gap: 10, flex: 1 },
  bannerIcon: { fontSize: 20 },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 13, fontWeight: '700', color: '#00E5A0', marginBottom: 4 },
  bannerMessage: { fontSize: 13, color: '#8A9BB0', lineHeight: 18 },
  bannerArrow: { color: '#00E5A0', fontSize: 12, marginLeft: 8 },
});

function MealsSection({ meals, todayName, navigation }) {
  const [expanded, setExpanded] = useState(false);
  const totalCals = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
  return (
    <View style={mealSectionStyles.card}>
      <TouchableOpacity style={mealSectionStyles.header} onPress={() => setExpanded(!expanded)}>
        <View style={mealSectionStyles.headerLeft}>
          <Text style={mealSectionStyles.title}>Today's Meals</Text>
          <Text style={mealSectionStyles.icon}>🥗</Text>
        </View>
        <View style={mealSectionStyles.headerRight}>
          <Text style={mealSectionStyles.cals}>{totalCals} kcal</Text>
          <Text style={mealSectionStyles.arrow}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>
      {expanded && meals.map((item, index) => (
        <TouchableOpacity key={index} style={mealSectionStyles.mealItem} onPress={() => navigation.navigate('Recipe', { meal: { meal: item.meal, food: item.food, calories: item.calories, time: item.time } })}>
          <View style={mealSectionStyles.mealLeft}>
            <Text style={mealSectionStyles.mealName}>{item.meal}</Text>
            <Text style={mealSectionStyles.mealTime}>{item.time}</Text>
            <Text style={mealSectionStyles.mealFood}>{item.food}</Text>
          </View>
          <View style={mealSectionStyles.mealRight}>
            <Text style={mealSectionStyles.mealCal}>{item.calories}</Text>
            <Text style={mealSectionStyles.mealCalUnit}>kcal</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const mealSectionStyles = StyleSheet.create({
  card: { backgroundColor: '#111820', borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: '#F0F4F8' },
  icon: { fontSize: 18 },
  cals: { fontSize: 13, color: '#00E5A0', fontWeight: '600' },
  arrow: { color: '#00E5A0', fontSize: 12 },
  mealItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 18, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  mealLeft: { flex: 1 },
  mealName: { fontSize: 14, fontWeight: '600', color: '#F0F4F8' },
  mealTime: { fontSize: 12, color: '#4A5A6A', marginTop: 2 },
  mealFood: { fontSize: 13, color: '#8A9BB0', marginTop: 2 },
  mealRight: { alignItems: 'flex-end' },
  mealCal: { fontSize: 16, fontWeight: '700', color: '#00E5A0' },
  mealCalUnit: { fontSize: 11, color: '#4A5A6A' },
});

function GroceryListSection({ groceryList, groceryChecked, toggleGrocery, addGroceryItem, scrollRef }) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState({});
  const [showAddInput, setShowAddInput] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const fadeAnims = useRef({});
  const scheduledRef = useRef({});
  const timeoutRefs = useRef({});

  const prevGroceryListRef = useRef([]);

  // Reset only when a new plan replaces the list (not when items are appended).
  // Compare by reference: plans are deterministic, so a regenerated list can be
  // content-identical to the old one but must still clear dismissed items.
  useEffect(() => {
    const prev = prevGroceryListRef.current;
    if (groceryList === prev) return;
    const isAppend = groceryList.length > prev.length && prev.every((v, i) => v === groceryList[i]);
    if (!isAppend) {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
      timeoutRefs.current = {};
      setDismissed({});
      scheduledRef.current = {};
      fadeAnims.current = {};
    }
    prevGroceryListRef.current = groceryList;
  }, [groceryList]);

  // Schedule fade-out 1.5s after an item is checked; reset if unchecked
  useEffect(() => {
    Object.keys(groceryChecked).forEach(key => {
      const idx = Number(key);
      if (groceryChecked[key] && !scheduledRef.current[idx]) {
        // Item just checked — schedule fade
        scheduledRef.current[idx] = true;
        if (!fadeAnims.current[idx]) fadeAnims.current[idx] = new Animated.Value(1);
        timeoutRefs.current[idx] = setTimeout(() => {
          if (scheduledRef.current[idx]) {
            Animated.timing(fadeAnims.current[idx], {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start(() => setDismissed(prev => ({ ...prev, [idx]: true })));
          }
        }, 1500);
      } else if (!groceryChecked[key] && scheduledRef.current[idx]) {
        // Item unchecked — cancel fade and reset
        clearTimeout(timeoutRefs.current[idx]);
        scheduledRef.current[idx] = false;
        if (fadeAnims.current[idx]) fadeAnims.current[idx].setValue(1);
        setDismissed(prev => { const next = { ...prev }; delete next[idx]; return next; });
      }
    });
  }, [groceryChecked]);

  const checkedCount = Object.values(groceryChecked).filter(Boolean).length;

  return (
    <View style={groceryStyles.card}>
      <TouchableOpacity style={groceryStyles.header} onPress={() => setExpanded(!expanded)}>
        <View style={groceryStyles.headerLeft}>
          <Text style={groceryStyles.title}>Grocery List</Text>
          <Text style={groceryStyles.icon}>🛒</Text>
        </View>
        <View style={groceryStyles.headerRight}>
          {checkedCount > 0 && (
            <View style={groceryStyles.badge}>
              <Text style={groceryStyles.badgeText}>{checkedCount}/{groceryList.length}</Text>
            </View>
          )}
          <Text style={groceryStyles.arrow}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={groceryStyles.list}>
          {groceryList.map((item, index) => {
            if (dismissed[index]) return null;
            if (showAddInput && groceryChecked[index]) return null;
            if (!fadeAnims.current[index]) fadeAnims.current[index] = new Animated.Value(1);
            return (
              <Animated.View key={index} style={{ opacity: fadeAnims.current[index] }}>
                <TouchableOpacity style={groceryStyles.row} onPress={() => toggleGrocery(index)}>
                  <View style={[groceryStyles.checkbox, groceryChecked[index] && groceryStyles.checkboxDone]}>
                    {groceryChecked[index] && <Text style={groceryStyles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[groceryStyles.text, groceryChecked[index] && groceryStyles.textDone]}>{item}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
          {expanded && (
            <View style={groceryStyles.addRow}>
              {showAddInput ? (
                <View style={groceryStyles.addInputRow}>
                  <TextInput
                    style={groceryStyles.addInput}
                    placeholder="e.g. 2 lbs chicken breast"
                    placeholderTextColor="#4A5A6A"
                    value={newItemText}
                    onChangeText={setNewItemText}
                    autoFocus
                    onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (newItemText.trim()) { addGroceryItem(newItemText.trim()); setNewItemText(''); setShowAddInput(false); }
                    }}
                  />
                  <TouchableOpacity onPress={() => {
                    if (newItemText.trim()) { addGroceryItem(newItemText.trim()); setNewItemText(''); setShowAddInput(false); }
                  }} style={groceryStyles.addConfirmBtn}>
                    <Text style={groceryStyles.addConfirmText}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setShowAddInput(false); setNewItemText(''); }} style={groceryStyles.cancelBtn}>
                    <Text style={groceryStyles.cancelText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={groceryStyles.addItemBtn} onPress={() => setShowAddInput(true)}>
                  <Text style={groceryStyles.addItemText}>+ Add Item</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const groceryStyles = StyleSheet.create({
  card: { backgroundColor: '#111820', borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: '#F0F4F8' },
  icon: { fontSize: 18 },
  badge: { backgroundColor: 'rgba(0,229,160,0.12)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)' },
  badgeText: { color: '#00E5A0', fontSize: 12, fontWeight: '600' },
  arrow: { color: '#00E5A0', fontSize: 12 },
  list: { paddingHorizontal: 18, paddingBottom: 4, gap: 8 },
  addRow: { paddingHorizontal: 18, paddingBottom: 14, paddingTop: 4 },
  addInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addInput: { flex: 1, backgroundColor: '#1A2330', borderRadius: 8, padding: 10, color: '#F0F4F8', fontSize: 14, borderWidth: 1, borderColor: 'rgba(0,229,160,0.3)' },
  addConfirmBtn: { backgroundColor: '#00E5A0', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  addConfirmText: { color: '#040A07', fontWeight: '700', fontSize: 14 },
  cancelBtn: { padding: 10 },
  cancelText: { color: '#8A9BB0', fontSize: 16 },
  addItemBtn: { paddingVertical: 8 },
  addItemText: { color: '#00E5A0', fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#00E5A0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxDone: { backgroundColor: '#00E5A0' },
  checkmark: { color: '#040A07', fontSize: 13, fontWeight: 'bold' },
  text: { fontSize: 14, color: '#8A9BB0', flex: 1 },
  textDone: { textDecorationLine: 'line-through', color: '#4A5A6A' },
});

function DashboardScreenInner({ navigation, route }) {
  const { isPro } = usePro();
  const [userData, setUserData] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [completedWorkouts, setCompletedWorkouts] = useState({});
  const [workoutsExpanded, setWorkoutsExpanded] = useState(true);
  const [groceryChecked, setGroceryChecked] = useState({});
  const [stepCount, setStepCount] = useState(0);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const STEP_GOAL = 10000;
  const wasOfflineRef = useRef(false);
  const scrollRef = useRef(null);

  const syncPendingWrites = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const pendingWorkouts = await loadPendingWorkouts();
    const pendingGrocery = await loadPendingGrocery();
    if (!pendingWorkouts && !pendingGrocery) return;
    try {
      const updates = {};
      if (pendingWorkouts) updates.completedWorkouts = { [pendingWorkouts.weekKey]: pendingWorkouts.data };
      if (pendingGrocery) updates.groceryChecked = pendingGrocery;
      await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
      if (pendingWorkouts) await clearPendingWorkouts();
      if (pendingGrocery) await clearPendingGrocery();
      console.log('syncPendingWrites: offline changes synced to Firestore');
    } catch (e) {
      console.log('syncPendingWrites: failed', e);
    }
  };

  // Track connectivity and sync pending writes on reconnect
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async state => {
      const offline = !state.isConnected || state.isInternetReachable === false;
      setIsOffline(offline);
      if (wasOfflineRef.current && !offline) {
        await syncPendingWrites();
      }
      wasOfflineRef.current = offline;
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        if (!isHealthDataAvailable()) {
          console.log('HealthKit: health data not available on this device');
          setIsPedometerAvailable(false);
          return;
        }
        await requestAuthorization({ toRead: ['HKQuantityTypeIdentifierStepCount'] });
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const stats = await queryStatisticsForQuantity(
          'HKQuantityTypeIdentifierStepCount',
          ['cumulativeSum'],
          { filter: { date: { startDate: start, endDate: new Date() } }, unit: 'count' }
        );
        setIsPedometerAvailable(true);
        setStepCount(Math.round(stats?.sumQuantity?.quantity ?? 0));
      } catch (e) {
        console.log('HealthKit exception:', e);
        setIsPedometerAvailable(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  useEffect(() => {
    if (route?.params?.planGenerated) {
      loadUserData();
    }
  }, [route?.params?.planGenerated]);
  
  const loadUserData = async () => {
  try {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        setPlan(data.savedPlan || null);
        if (data.groceryChecked && Object.keys(groceryChecked).length === 0) setGroceryChecked(data.groceryChecked);
        if (data.completedWorkouts) {
          const weekKey = getWeekKey();
          setCompletedWorkouts(data.completedWorkouts[weekKey] || {});
        }
        // Cache fresh data for offline use
        await saveUserData(data);
        if (data.savedPlan) await savePlan(data.savedPlan);
        setFromCache(false);
      }
    } catch (error) {
      // Firestore failed — try local cache
      console.log('Firestore load failed, trying cache:', error.message);
      const cachedUserData = await loadCachedUserData();
      const cachedPlan = await loadPlan();
      if (cachedUserData) {
        setUserData(cachedUserData);
        if (cachedPlan) setPlan(cachedPlan);
        if (cachedUserData.groceryChecked && Object.keys(groceryChecked).length === 0) setGroceryChecked(cachedUserData.groceryChecked);
        if (cachedUserData.completedWorkouts) {
          const weekKey = getWeekKey();
          setCompletedWorkouts(cachedUserData.completedWorkouts[weekKey] || {});
        }
        setFromCache(true);
      }
    } finally {
      // Apply any pending offline writes on top of whatever was loaded
      const pendingWorkouts = await loadPendingWorkouts();
      if (pendingWorkouts && pendingWorkouts.weekKey === getWeekKey()) {
        setCompletedWorkouts(pendingWorkouts.data);
      }
      const pendingGrocery = await loadPendingGrocery();
      if (pendingGrocery && Object.keys(groceryChecked).length === 0) setGroceryChecked(pendingGrocery);
      setLoading(false);
    }
  };

  const getWeekKey = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFirstName = () => {
    if (userData?.firstName && userData.firstName.trim()) {
      return userData.firstName.trim();
    }
    return '';
  };

  const toggleWorkout = async (index) => {
    const newCompleted = { ...completedWorkouts, [index]: !completedWorkouts[index] };
    setCompletedWorkouts(newCompleted);
    const weekKey = getWeekKey();
    await savePendingWorkouts(weekKey, newCompleted);
    if (isOffline) return;
    try {
      const user = auth.currentUser;
      await setDoc(doc(db, 'users', user.uid), { completedWorkouts: { [weekKey]: newCompleted } }, { merge: true });
      await clearPendingWorkouts();
    } catch (error) {
      console.log('Error saving workout:', error);
    }
  };

  const addGroceryItem = async (item) => {
    if (!isPro) { navigation.navigate('Paywall'); return; }
    console.log('addGroceryItem called with:', item);
    console.log('plan is:', plan ? 'loaded' : 'null');
    if (!plan) return;
    const newList = [...(plan.groceryList || []), item];
    const newPlan = { ...plan, groceryList: newList, groceryUserItems: [...(plan.groceryUserItems || []), item] };
    setPlan(newPlan);
    await savePlan(newPlan);
    try {
      const user = auth.currentUser;
      await setDoc(doc(db, 'users', user.uid), { savedPlan: newPlan }, { merge: true });
    } catch (error) {
      console.log('Error saving grocery item:', error);
    }
  };

  const toggleGrocery = useCallback(async (index) => {
    if (!isPro) { navigation.navigate('Paywall'); return; }
    const newChecked = { ...groceryChecked, [index]: !groceryChecked[index] };
    setGroceryChecked(newChecked);
    await savePendingGrocery(newChecked);
    if (isOffline) return;
    try {
      const user = auth.currentUser;
      await setDoc(doc(db, 'users', user.uid), { groceryChecked: newChecked }, { merge: true });
      await clearPendingGrocery();
    } catch (error) {
      console.log('Error saving grocery:', error);
    }
  }, [groceryChecked, isOffline, isPro]);

  const getWorkoutsCompleted = () => Object.values(completedWorkouts).filter(Boolean).length;

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const getTodaysMeals = () => {
    if (!plan) return [];
    const dayMap = {
      'Monday': plan.mondayMeals,
      'Tuesday': plan.tuesdayMeals,
      'Wednesday': plan.wednesdayMeals,
      'Thursday': plan.thursdayMeals,
      'Friday': plan.fridayMeals,
      'Saturday': plan.saturdayMeals,
      'Sunday': plan.sundayMeals,
    };
    return dayMap[todayName] || plan.mondayMeals || plan.dailyMeals || [];
  };

  const analyzeAndAdaptPlan = async () => {
    if (!isPro) { navigation.navigate('Paywall'); return; }
    if (!plan) return;
    if (isOffline) {
      Alert.alert('You\'re offline', 'Plan analysis requires an internet connection.');
      return;
    }
    const completed = getWorkoutsCompleted();
    const total = plan.weeklyWorkouts.length;
    const rate = total > 0 ? (completed / total) * 100 : 0;
    let adaptMessage = '';
    let intensity = '';
    if (rate >= 80) { adaptMessage = `Amazing! You completed ${completed}/${total} workouts (${Math.round(rate)}%). Your plan will be upgraded!`; intensity = 'increase'; }
    else if (rate < 50) { adaptMessage = `You completed ${completed}/${total} workouts (${Math.round(rate)}%). Your plan will be adjusted to be more manageable!`; intensity = 'decrease'; }
    else { adaptMessage = `Good effort! You completed ${completed}/${total} workouts (${Math.round(rate)}%). Keep it up!`; intensity = 'maintain'; }
    Alert.alert('Weekly Analysis', adaptMessage, [
      { text: 'Keep Current Plan', style: 'cancel' },
      {
        text: intensity === 'maintain' ? 'OK' : 'Adapt My Plan',
        onPress: async () => {
          if (intensity === 'maintain') return;
          setGeneratingPlan(true);
          try {
            const busyDays = userData.busyDays && userData.busyDays.length > 0 ? userData.busyDays.join(', ') : 'None';
            const generatePlanFn = httpsCallable(functions, 'matchMealPlan');
            const result = await generatePlanFn({ userData: { ...userData, busyDays: userData.busyDays }, busyDays });
            const parsed = result.data;
            await attachGroceryList(parsed, plan);
            setPlan(parsed);
            setCompletedWorkouts({});
            setGroceryChecked({});
            const user = auth.currentUser;
            await setDoc(doc(db, 'users', user.uid), { savedPlan: parsed }, { merge: true });
            await savePlan(parsed);
            Alert.alert('Plan Updated!', 'Your plan has been adapted.');
          } catch (error) {
            Alert.alert(
              isRateLimited(error) ? 'Daily Limit Reached' : 'Error',
              isRateLimited(error)
                ? "You've reached your daily plan generation limit. It resets at midnight UTC — try again tomorrow!"
                : error.message
            );
          } finally {
            setGeneratingPlan(false);
          }
        }
      }
    ]);
  };

  const generatePlan = async () => {
    if (!isPro) { navigation.navigate('Paywall'); return; }
    if (isOffline) {
      Alert.alert('You\'re offline', 'Generating a new plan requires an internet connection.');
      return;
    }
    setGeneratingPlan(true);
    try {
      const busyDays = userData.busyDays && userData.busyDays.length > 0 ? userData.busyDays.join(', ') : 'None';
      const generatePlanFn = httpsCallable(functions, 'matchMealPlan');
      const result = await generatePlanFn({ userData, busyDays });
      const parsed = result.data;
      await attachGroceryList(parsed, plan);
      setPlan(parsed);
      setCompletedWorkouts({});
      setGroceryChecked({});
      const user = auth.currentUser;
      await setDoc(doc(db, 'users', user.uid), { savedPlan: parsed }, { merge: true });
      await savePlan(parsed);
      setFromCache(false);
    } catch (error) {
      console.log('Generate plan error:', error.code, error.message);
      Alert.alert(
        isRateLimited(error) ? 'Daily Limit Reached' : 'Error generating plan',
        isRateLimited(error)
          ? "You've reached your daily plan generation limit. It resets at midnight UTC — try again tomorrow!"
          : error.message
      );
    } finally {
      setGeneratingPlan(false);
    }
  };

  const addToCalendar = async () => {
    if (isOffline) {
      Alert.alert('You\'re offline', 'Adding to calendar requires an internet connection.');
      return;
    }
    try {
      const permissions = await requestPermissions();
      if (!permissions.calendar) { Alert.alert('Permission Required', 'Please allow calendar access.'); return; }
      const calendarId = await getOrCreateCalendar();
      await addMealsToCalendar(getTodaysMeals(), calendarId);
      await addWorkoutsToCalendar(plan.weeklyWorkouts, calendarId, userData.workoutTimes || []);
      Alert.alert('Success!', 'Your meals and workouts have been added to your calendar!');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00E5A0" />
      </View>
    );
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps='handled'>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}, <Text style={styles.greetingName}>{getFirstName()}</Text></Text>
        </View>
        <Text style={styles.dateText}>{today}</Text>
      </View>

      {fromCache && (
        <View style={styles.cacheBanner}>
          <Text style={styles.cacheBannerText}>📦 Showing cached plan — connect to sync</Text>
        </View>
      )}

      {userData && plan && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>STEPS</Text>
            {isPedometerAvailable ? (
              <>
                <Text style={styles.statValue}>{stepCount.toLocaleString()}</Text>
                <Text style={styles.statChange}>{Math.round((stepCount / STEP_GOAL) * 100)}% of {STEP_GOAL.toLocaleString()}</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min((stepCount / STEP_GOAL) * 100, 100)}%` }]} />
                </View>
                <Text style={styles.healthAttribution}>❤️ From Apple Health</Text>
              </>
            ) : (
              <Text style={styles.statChange}>Unavailable</Text>
            )}
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>WORKOUTS</Text>
            <Text style={styles.statValue}>{getWorkoutsCompleted()}<Text style={styles.statUnit}>/{plan.weeklyWorkouts.length}</Text></Text>
            <Text style={styles.statChangeGood}>This week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>CALORIES</Text>
            <Text style={styles.statValue}>{plan.dailyCalories}<Text style={styles.statUnit}> kcal</Text></Text>
            <Text style={styles.statChange}>Daily target</Text>
          </View>
        </View>
      )}

      {!plan && (
        isOffline ? (
          <View style={styles.offlineCard}>
            <Text style={styles.offlineCardIcon}>📵</Text>
            <Text style={styles.offlineCardTitle}>No plan available offline</Text>
            <Text style={styles.offlineCardText}>Connect to the internet to generate your AI plan.</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.generateButton} onPress={generatePlan} disabled={generatingPlan}>
            {generatingPlan ? (
              <View style={styles.generatingContainer}>
                <ActivityIndicator color="#040A07" />
                <Text style={styles.generatingText}>Building your plan...</Text>
              </View>
            ) : (
              <Text style={styles.generateButtonText}>Generate My AI Plan 🤖</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {plan && (
        <>
          <CoachBanner message={plan.coachMessage} />

          <View style={styles.card}>
            <TouchableOpacity style={styles.workoutHeader} onPress={() => setWorkoutsExpanded(!workoutsExpanded)}>
              <Text style={styles.cardTitle}>Weekly Workouts 💪</Text>
              <View style={styles.workoutHeaderRight}>
                <View style={styles.progressPill}>
                  <Text style={styles.progressPillText}>{getWorkoutsCompleted()}/{plan.weeklyWorkouts.length} done</Text>
                </View>
                <Text style={styles.collapseArrow}>{workoutsExpanded ? '▲' : '▼'}</Text>
              </View>
            </TouchableOpacity>
            {workoutsExpanded && plan.weeklyWorkouts.map((item, index) => (
              <TouchableOpacity key={index} style={[styles.workoutItem, completedWorkouts[index] && styles.workoutItemDone]} onPress={() => navigation.navigate('WorkoutDetail', { workout: { day: item.day, workout: item.workout, duration: item.duration } })}>
                <TouchableOpacity style={[styles.workoutNum, completedWorkouts[index] && styles.workoutNumDone]} onPress={() => toggleWorkout(index)}>
                  <Text style={[styles.workoutNumText, completedWorkouts[index] && styles.workoutNumTextDone]}>
                    {completedWorkouts[index] ? '✓' : index + 1}
                  </Text>
                </TouchableOpacity>
                <View style={styles.workoutInfo}>
                  <Text style={[styles.workoutDay, completedWorkouts[index] && styles.textFaded]}>{item.day}</Text>
                  <Text style={[styles.workoutDetail, completedWorkouts[index] && styles.textFaded]}>{item.workout}</Text>
                  <Text style={styles.workoutDuration}>⏱ {item.duration}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <MealsSection meals={getTodaysMeals()} todayName={todayName} navigation={navigation} />

          <GroceryListSection groceryList={plan.groceryList} groceryChecked={groceryChecked} toggleGrocery={toggleGrocery} addGroceryItem={addGroceryItem} scrollRef={scrollRef} />

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButtonOrange, isOffline && styles.actionButtonDisabled]}
              onPress={analyzeAndAdaptPlan}
              disabled={isOffline}
            >
              <Text style={styles.actionButtonText}>📊 Analyze Week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButtonBlue, isOffline && styles.actionButtonDisabled]}
              onPress={addToCalendar}
              disabled={isOffline}
            >
              <Text style={styles.actionButtonText}>📅 Add to Calendar</Text>
            </TouchableOpacity>
          </View>

          {isOffline ? (
            <View style={styles.offlineRegenNotice}>
              <Text style={styles.offlineRegenNoticeText}>🔌 Regenerate plan available when online</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.regenerateButton} onPress={() => { setPlan(null); generatePlan(); }}>
              <Text style={styles.regenerateText}>Regenerate Plan</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080C10' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: '#080C10', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#F0F4F8', marginBottom: 4 },
  greetingName: { color: '#00E5A0' },
  dateText: { fontSize: 12, color: '#4A5A6A', textAlign: 'right' },
  cacheBanner: { backgroundColor: 'rgba(255,179,0,0.08)', borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,179,0,0.2)', alignItems: 'center' },
  cacheBannerText: { color: '#FFB300', fontSize: 13, fontWeight: '600' },
  offlineCard: { backgroundColor: '#111820', borderRadius: 14, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center' },
  offlineCardIcon: { fontSize: 32, marginBottom: 10 },
  offlineCardTitle: { fontSize: 16, fontWeight: '700', color: '#F0F4F8', marginBottom: 6 },
  offlineCardText: { fontSize: 13, color: '#8A9BB0', textAlign: 'center' },
  offlineRegenNotice: { backgroundColor: '#111820', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  offlineRegenNoticeText: { color: '#4A5A6A', fontSize: 14, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#111820', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#8A9BB0', letterSpacing: 0.5, marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#F0F4F8', letterSpacing: -0.5 },
  statUnit: { fontSize: 11, color: '#8A9BB0', fontWeight: '400' },
  statChange: { fontSize: 11, color: '#8A9BB0', marginTop: 4 },
  healthAttribution: { fontSize: 9, color: '#8A9BB0', marginTop: 6 },
  statChangeGood: { fontSize: 11, color: '#00E5A0', marginTop: 4 },
  generateButton: { backgroundColor: '#00E5A0', borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 20 },
  generateButtonText: { color: '#040A07', fontSize: 17, fontWeight: '700' },
  generatingContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  generatingText: { color: '#040A07', fontSize: 16, fontWeight: '600' },
  card: { backgroundColor: '#111820', borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#F0F4F8', letterSpacing: 0.3 },
  cardIcon: { fontSize: 18 },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  workoutHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  collapseArrow: { color: '#00E5A0', fontSize: 14, fontWeight: '700' },
  progressPill: { backgroundColor: 'rgba(0,229,160,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)' },
  progressPillText: { color: '#00E5A0', fontSize: 12, fontWeight: '600' },
  workoutItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 12 },
  workoutItemDone: { opacity: 0.5 },
  workoutNum: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(0,229,160,0.12)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  workoutNumDone: { backgroundColor: '#00E5A0', borderColor: '#00E5A0' },
  workoutNumText: { fontSize: 13, fontWeight: '700', color: '#00E5A0' },
  workoutNumTextDone: { color: '#040A07' },
  workoutInfo: { flex: 1 },
  workoutDay: { fontSize: 14, fontWeight: '600', color: '#F0F4F8', marginBottom: 2 },
  workoutDetail: { fontSize: 13, color: '#8A9BB0', marginBottom: 4, lineHeight: 18 },
  workoutDuration: { fontSize: 12, color: '#4A5A6A' },
  textFaded: { color: '#4A5A6A', textDecorationLine: 'line-through' },
  mealItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  mealLeft: { flex: 1 },
  mealName: { fontSize: 14, fontWeight: '600', color: '#F0F4F8' },
  mealTime: { fontSize: 12, color: '#4A5A6A', marginTop: 2 },
  mealFood: { fontSize: 13, color: '#8A9BB0', marginTop: 2 },
  mealRight: { alignItems: 'flex-end' },
  mealCal: { fontSize: 16, fontWeight: '700', color: '#00E5A0' },
  mealCalUnit: { fontSize: 11, color: '#4A5A6A' },
  groceryListContainer: { gap: 8 },
  groceryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  groceryCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#00E5A0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  groceryCheckboxDone: { backgroundColor: '#00E5A0' },
  groceryCheckmark: { color: '#040A07', fontSize: 13, fontWeight: 'bold' },
  groceryText: { fontSize: 14, color: '#8A9BB0', flex: 1 },
  groceryTextDone: { textDecorationLine: 'line-through', color: '#4A5A6A' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionButtonOrange: { flex: 1, backgroundColor: '#1A2330', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FFB547' },
  actionButtonBlue: { flex: 1, backgroundColor: '#1A2330', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#4D9FFF' },
  actionButtonDisabled: { opacity: 0.4 },
  actionButtonText: { color: '#F0F4F8', fontSize: 13, fontWeight: '600' },
  regenerateButton: { backgroundColor: '#111820', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)' },
  regenerateText: { color: '#00E5A0', fontSize: 15, fontWeight: '600' },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 6 },
  progressFill: { height: 4, backgroundColor: '#00E5A0', borderRadius: 2 },
});

export default function DashboardScreen(props) {
  return (
    <ErrorBoundary screenName="DashboardScreen">
      <DashboardScreenInner {...props} />
    </ErrorBoundary>
  );
}
