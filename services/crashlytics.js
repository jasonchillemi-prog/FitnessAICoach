import crashlytics from '@react-native-firebase/crashlytics';

export const logError = (error, context = '') => {
  try {
    crashlytics().log(`Error in ${context}: ${error.message}`);
    crashlytics().recordError(error);
  } catch (e) {
    console.log('Crashlytics error:', e);
  }
};

export const setUserForCrashlytics = (userId, email) => {
  try {
    crashlytics().setUserId(userId);
    crashlytics().setAttribute('email', email);
  } catch (e) {
    console.log('Crashlytics set user error:', e);
  }
};

export const logMessage = (message) => {
  try {
    crashlytics().log(message);
  } catch (e) {
    console.log('Crashlytics log error:', e);
  }
};
