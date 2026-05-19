import { useState } from 'react';
import * as Location from 'expo-location';
import { UGBOWO_BOUNDS } from '../constants';

export function useGeofence() {
  const [checking, setChecking] = useState(false);

  const isInUgbowo = (lat, lng) =>
    lat >= UGBOWO_BOUNDS.minLat &&
    lat <= UGBOWO_BOUNDS.maxLat &&
    lng >= UGBOWO_BOUNDS.minLng &&
    lng <= UGBOWO_BOUNDS.maxLng;

  // Returns { ok, coords, error }
  const checkLocation = async () => {
    setChecking(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return { ok: false, error: 'Location permission denied. Please enable it in Settings to post a listing.' };
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
      });

      const { latitude, longitude } = loc.coords;

      // Use actual coords if inside Ugbowo, otherwise default to campus center
      const coords = isInUgbowo(latitude, longitude)
        ? { latitude, longitude }
        : { latitude: 6.3490, longitude: 5.6221 };

      return { ok: true, coords };
    } catch (e) {
      return { ok: false, error: 'Could not get your location. Please try again.' };
    } finally {
      setChecking(false);
    }
  };

  return { checkLocation, checking };
}
