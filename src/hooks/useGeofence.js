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

      if (!isInUgbowo(latitude, longitude)) {
        return {
          ok: false,
          error: 'You must be within the Ugbowo campus area to post a listing. This marketplace is restricted to UNIBEN Ugbowo students.',
        };
      }

      return { ok: true, coords: { latitude, longitude } };
    } catch (e) {
      return { ok: false, error: 'Could not get your location. Please try again.' };
    } finally {
      setChecking(false);
    }
  };

  return { checkLocation, checking };
}
