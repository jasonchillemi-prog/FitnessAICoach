import analytics from '@react-native-firebase/analytics';

export const logEvent = async (eventName, params = {}) => {
  try {
    await analytics().logEvent(eventName, params);
  } catch (e) {
    // Fail silently — never crash the app over analytics
    console.log('Analytics error:', e.message);
  }
};

// App Events
export const logAppOpen = () => logEvent('app_open');
export const logLogin = (method = 'email') => analytics().logLogin({ method });
export const logSignUp = (method = 'email') => analytics().logSignUp({ method });

// Workout Events
export const logWorkoutStarted = (workoutType) =>
  logEvent('workout_started', { workout_type: workoutType });
export const logWorkoutCompleted = (workoutType, durationMinutes) =>
  logEvent('workout_completed', { workout_type: workoutType, duration_minutes: durationMinutes });
export const logPlanReset = () => logEvent('plan_reset');

// Meal Events
export const logMealViewed = (mealName) =>
  logEvent('meal_viewed', { meal_name: mealName });
export const logRecipeViewed = (recipeName) =>
  logEvent('recipe_viewed', { recipe_name: recipeName });

// Screen Events
export const logScreenView = (screenName) =>
  analytics().logScreenView({ screen_name: screenName, screen_class: screenName });
