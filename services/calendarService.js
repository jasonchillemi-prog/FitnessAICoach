import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Request calendar and notification permissions
export const requestPermissions = async () => {
  const { status: calendarStatus } = await Calendar.requestCalendarPermissionsAsync();
  const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
  
  return {
    calendar: calendarStatus === 'granted',
    notifications: notificationStatus === 'granted'
  };
};

// Get or create a FitnessAI calendar
export const getOrCreateCalendar = async () => {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find(c => c.title === 'FitnessAI Coach');
  
  if (existing) return existing.id;

  const defaultCalendar = await Calendar.getDefaultCalendarAsync();
  
  const calendarId = await Calendar.createCalendarAsync({
    title: 'FitnessAI Coach',
    color: '#00ff88',
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: defaultCalendar.source.id,
    source: defaultCalendar.source,
    name: 'FitnessAI Coach',
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  return calendarId;
};

// Add meal events to calendar
export const addMealsToCalendar = async (meals, calendarId) => {
  const today = new Date();
  const eventIds = [];

  for (const meal of meals) {
    const [hourStr, minuteStr] = meal.time.replace(' AM', '').replace(' PM', '').split(':');
    let hour = parseInt(hourStr);
    const minute = parseInt(minuteStr) || 0;
    
    if (meal.time.includes('PM') && hour !== 12) hour += 12;
    if (meal.time.includes('AM') && hour === 12) hour = 0;

    const startDate = new Date(today);
    startDate.setHours(hour, minute, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 30);

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `🥗 ${meal.meal}: ${meal.food.substring(0, 40)}`,
      startDate,
      endDate,
      notes: `${meal.food}\n\nCalories: ${meal.calories} cal`,
      alarms: [{ relativeOffset: -15 }],
      recurrenceRule: {
        frequency: Calendar.Frequency.DAILY,
      }
    });

    eventIds.push(eventId);
  }

  return eventIds;
};

// Add workout events to calendar
export const addWorkoutsToCalendar = async (workouts, calendarId) => {
  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const eventIds = [];

  for (const workout of workouts) {
    const targetDay = dayNames.indexOf(workout.day);
    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil < 0) daysUntil += 7;

    const workoutDate = new Date(today);
    workoutDate.setDate(today.getDate() + daysUntil);
    workoutDate.setHours(7, 0, 0, 0);

    const endDate = new Date(workoutDate);
    endDate.setHours(8, 0, 0, 0);

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `💪 Workout: ${workout.workout.substring(0, 40)}`,
      startDate: workoutDate,
      endDate,
      notes: `${workout.workout}\n\nDuration: ${workout.duration}`,
      alarms: [{ relativeOffset: -30 }],
      recurrenceRule: {
        frequency: Calendar.Frequency.WEEKLY,
      }
    });

    eventIds.push(eventId);
  }

  return eventIds;
};