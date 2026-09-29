"use client";

import * as React from "react";
import { ReportLocation, LocationSource } from "../reports/types";

export type GeolocationState =
  | "idle"
  | "requesting"
  | "acquired"
  | "denied"
  | "unavailable"
  | "timeout"
  | "manual";

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  defaultLatitude?: number;
  defaultLongitude?: number;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    defaultLatitude = 13.7563,
    defaultLongitude = 100.5018,
  } = options;

  const [state, setState] = React.useState<GeolocationState>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [location, setLocation] = React.useState<ReportLocation>({
    latitude: defaultLatitude,
    longitude: defaultLongitude,
    accuracyMeters: undefined,
    source: "manual",
    capturedAt: new Date().toISOString(),
    localityLabel: "Bangkok Central",
  });
  const [isManualOverride, setIsManualOverride] = React.useState(false);

  const watchIdRef = React.useRef<number | null>(null);

  const requestLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      setState("unavailable");
      setErrorMessage("Geolocation is not supported by your browser");
      return;
    }

    setState("requesting");
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (!isManualOverride) {
          setLocation({
            latitude,
            longitude,
            accuracyMeters: Math.round(accuracy),
            source: "gps",
            capturedAt: new Date().toISOString(),
            localityLabel: "Current Device Location",
          });
        }
        setState("acquired");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setState("denied");
          setErrorMessage("Location permission was denied. You can place the pin manually.");
        } else if (error.code === error.TIMEOUT) {
          setState("timeout");
          setErrorMessage("Location request timed out. Please select location manually.");
        } else {
          setState("unavailable");
          setErrorMessage("Unable to retrieve device position.");
        }
      },
      { enableHighAccuracy, timeout, maximumAge }
    );
  }, [enableHighAccuracy, timeout, maximumAge, isManualOverride]);

  const setManualLocation = React.useCallback(
    (lat: number, lng: number, localityLabel?: string) => {
      setIsManualOverride(true);
      setState("manual");
      setLocation({
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        accuracyMeters: undefined,
        source: "manual",
        capturedAt: new Date().toISOString(),
        localityLabel: localityLabel || "Selected on Map",
      });
    },
    []
  );

  const returnToGps = React.useCallback(() => {
    setIsManualOverride(false);
    requestLocation();
  }, [requestLocation]);

  React.useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    state,
    location,
    errorMessage,
    isManualOverride,
    requestLocation,
    setManualLocation,
    returnToGps,
  };
}
