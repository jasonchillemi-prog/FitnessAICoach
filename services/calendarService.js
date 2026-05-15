import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';

export const requestPermissions = async () => {
  const { status: calendarStatus } = await Calendar.requestCalendarPermissionsAsync();
  const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
  return {
    calendar: calendarStatus === 'granted',
    notifications: notificationStatus === 'granted'
  };
};

export const getOrCreateCalendar = async () => {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.filter(c => c.title === 'KineticIQ Coach' || c.title === 'FitnessAI Coach');

  for (const cal of existing) {
    await Calendar.deleteCalendarAsync(cal.id);
  }

  const defaultCalendar = await Calendar.getDefaultCalendarAsync();

  const calendarId = await Calendar.createCalendarAsync({
    title: 'KineticIQ Coach',
    color: '#00E5A0',
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: defaultCalendar.source.id,
    source: defaultCalendar.source,
    name: 'KineticIQ Coach',
    ownerAccount: 'personal',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });

  return calendarId;
};

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
      recurrenceRule: { frequency: Calendar.Frequency.DAILY }
    });
    eventIds.push(eventId);
  }
  return eventIds;
};

export const addWorkoutsToCalendar = async (workouts, calendarId, preferredTimes = []) => {
  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const eventIds = [];

  const getPreferredHour = () => {
    if (preferredTimes.length === 0) return 7;
    const time = preferredTimes[0];
    if (time.includes('5-7 AM') || time.includes('Early Morning')) return 6;
    if (time.includes('7-9 AM') || time.includes('Morning')) return 7;
    if (time.includes('11 AM') || time.includes('Midday')) return 11;
    if (time.includes('3-5 PM') || time.includes('Afternoon')) return 15;
    if (time.includes('6-8 PM') || time.includes('Evening')) return 18;
    if (time.includes('8-10 PM') || time.includes('Late Night')) return 20;
    return 7;
  };

  for (const workout of workouts) {
    const targetDay = dayNames.indexOf(workout.day);
    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil < 0) daysUntil += 7;

    const workoutDate = new Date(today);
    workoutDate.setDate(today.getDate() + daysUntil);
    const preferredHour = getPreferredHour();
    workoutDate.setHours(preferredHour, 0, 0, 0);

    const endDate = new Date(workoutDate);
    endDate.setHours(preferredHour + 1, 0, 0, 0);

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `💪 Workout: ${workout.workout.substring(0, 40)}`,
      startDate: workoutDate,
      endDate,
      notes: `${workout.workout}\n\nDuration: ${workout.duration}`,
      alarms: [{ relativeOffset: -30 }],
      recurrenceRule: { frequency: Calendar.Frequency.WEEKLY }
    });
    eventIds.push(eventId);
  }
  return eventIds;
};
