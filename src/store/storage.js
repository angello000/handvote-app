import AsyncStorage from '@react-native-async-storage/async-storage';

const EVENTS_KEY = '@handvote_events';

export async function getEvents() {
  try {
    const json = await AsyncStorage.getItem(EVENTS_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error('getEvents error', e);
    return [];
  }
}

export async function saveEvent(event) {
  try {
    const events = await getEvents();
    const existing = events.findIndex((e) => e.id === event.id);
    if (existing >= 0) {
      events[existing] = event;
    } else {
      events.push(event);
    }
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    console.error('saveEvent error', e);
  }
}

export async function deleteEvent(eventId) {
  try {
    const events = await getEvents();
    const filtered = events.filter((e) => e.id !== eventId);
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('deleteEvent error', e);
  }
}

export async function getEventById(eventId) {
  const events = await getEvents();
  return events.find((e) => e.id === eventId) || null;
}
