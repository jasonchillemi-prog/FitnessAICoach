import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PLAN: 'kiq_cached_plan',
  USER_DATA: 'kiq_cached_user_data',
  PENDING_WORKOUTS: 'kiq_pending_workouts',
  PENDING_GROCERY: 'kiq_pending_grocery',
};

export async function savePlan(plan) {
  try {
    await AsyncStorage.setItem(KEYS.PLAN, JSON.stringify(plan));
  } catch (e) {
    console.log('offlineCache: failed to save plan', e);
  }
}

export async function loadPlan() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PLAN);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.log('offlineCache: failed to load plan', e);
    return null;
  }
}

export async function saveUserData(userData) {
  try {
    await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(userData));
  } catch (e) {
    console.log('offlineCache: failed to save user data', e);
  }
}

export async function loadUserData() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.log('offlineCache: failed to load user data', e);
    return null;
  }
}

export async function savePendingWorkouts(weekKey, data) {
  try {
    await AsyncStorage.setItem(KEYS.PENDING_WORKOUTS, JSON.stringify({ weekKey, data }));
  } catch (e) {
    console.log('offlineCache: failed to save pending workouts', e);
  }
}

export async function loadPendingWorkouts() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PENDING_WORKOUTS);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.log('offlineCache: failed to load pending workouts', e);
    return null;
  }
}

export async function clearPendingWorkouts() {
  try {
    await AsyncStorage.removeItem(KEYS.PENDING_WORKOUTS);
  } catch (e) {
    console.log('offlineCache: failed to clear pending workouts', e);
  }
}

export async function savePendingGrocery(data) {
  try {
    await AsyncStorage.setItem(KEYS.PENDING_GROCERY, JSON.stringify(data));
  } catch (e) {
    console.log('offlineCache: failed to save pending grocery', e);
  }
}

export async function loadPendingGrocery() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PENDING_GROCERY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.log('offlineCache: failed to load pending grocery', e);
    return null;
  }
}

export async function clearPendingGrocery() {
  try {
    await AsyncStorage.removeItem(KEYS.PENDING_GROCERY);
  } catch (e) {
    console.log('offlineCache: failed to clear pending grocery', e);
  }
}

export async function clearAll() {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch (e) {
    console.log('offlineCache: failed to clear all', e);
  }
}
