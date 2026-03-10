import { useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import type { LatLng } from "react-native-maps";
import { updateKalmanPosition, type KalmanState } from "../utils/kalmanFilter";

export type MotionMode = "stationary" | "moving";
export type NavigationMode = "stationary" | "walking" | "cycling" | "driving";

export type NavigationState = {
  coordinate: { latitude: number; longitude: number };
  speedKmh: number;
  motionMode: MotionMode;
  navigationMode: NavigationMode;
  worldHeading: number;
  cameraHeading: number;
  markerHeadingRelative: number;
  accuracy: number | null;
};

type UseNavigationStateParams = {
  followUser?: boolean;
};

const DEFAULT_COORDINATE: LatLng = {
  latitude: -23.55052,
  longitude: -46.633308,
};

const START_MOVING_SPEED_KMH = 6;
const STOP_MOVING_SPEED_KMH = 2;
const LOW_SPEED_HEADING_KMH = 4;
const HIGH_SPEED_HEADING_KMH = 12;
const MAX_ACCEPTED_ACCURACY_METERS = 30;
const DRIFT_ALIGNMENT_THRESHOLD_DEGREES = 25;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeHeading(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function angleDelta(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

function lerpAngle(from: number, to: number, t: number) {
  const delta = angleDelta(from, to);
  return normalizeHeading(from + delta * t);
}

function smoothHeading(previous: number | null, next: number, alpha: number) {
  if (previous === null) {
    return normalizeHeading(next);
  }

  const delta = angleDelta(previous, next);
  return normalizeHeading(previous + alpha * delta);
}

function sanitizeSpeedKmh(speedMps: number | null) {
  if (speedMps === null || !Number.isFinite(speedMps)) {
    return 0;
  }

  return Math.max(0, speedMps * 3.6);
}

function getNavigationMode(speedKmh: number): NavigationMode {
  if (speedKmh < 2) {
    return "stationary";
  }

  if (speedKmh < 7) {
    return "walking";
  }

  if (speedKmh < 20) {
    return "cycling";
  }

  return "driving";
}

function getDynamicAlphas(mode: NavigationMode) {
  if (mode === "walking") {
    return { alphaHeading: 0.25, alphaPosition: 0.35 };
  }

  if (mode === "cycling") {
    return { alphaHeading: 0.2, alphaPosition: 0.45 };
  }

  if (mode === "driving") {
    return { alphaHeading: 0.15, alphaPosition: 0.6 };
  }

  return { alphaHeading: 0.25, alphaPosition: 0.2 };
}

export function useNavigationState(params: UseNavigationStateParams = {}): NavigationState {
  const followUser = params.followUser ?? true;
  const [coordinate, setCoordinate] = useState<LatLng>(DEFAULT_COORDINATE);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [motionMode, setMotionMode] = useState<MotionMode>("stationary");
  const [navigationMode, setNavigationMode] = useState<NavigationMode>("stationary");
  const [worldHeading, setWorldHeading] = useState(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const motionModeRef = useRef<MotionMode>("stationary");
  const filteredCoordinateRef = useRef<LatLng>(DEFAULT_COORDINATE);
  const smoothedHeadingRef = useRef<number | null>(0);
  const compassHeadingRef = useRef(0);
  const gpsCourseRef = useRef<number | null>(null);
  const speedKmhRef = useRef(0);
  const navigationModeRef = useRef<NavigationMode>("stationary");
  const kalmanStateRef = useRef<KalmanState | null>(null);
  const lockedCameraHeadingRef = useRef(0);
  const hasInitialFixRef = useRef(false);

  useEffect(() => {
    if (followUser) {
      lockedCameraHeadingRef.current = worldHeading;
    }
  }, [followUser, worldHeading]);

  useEffect(() => {
    let positionSubscription: Location.LocationSubscription | null = null;
    let headingSubscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    const updateHeadingState = (effectiveSpeedKmh: number, alphaHeading: number) => {
      let compassHeading = compassHeadingRef.current;
      const gpsCourse = gpsCourseRef.current;

      if (effectiveSpeedKmh > 10 && gpsCourse !== null) {
        const driftDelta = Math.abs(angleDelta(compassHeading, gpsCourse));
        if (driftDelta > DRIFT_ALIGNMENT_THRESHOLD_DEGREES) {
          compassHeading = lerpAngle(compassHeading, gpsCourse, 0.08);
          compassHeadingRef.current = compassHeading;
        }
      }

      let sourceHeading = compassHeading;

      if (effectiveSpeedKmh < 2) {
        sourceHeading = compassHeading;
      } else if (effectiveSpeedKmh > HIGH_SPEED_HEADING_KMH && gpsCourse !== null) {
        sourceHeading = gpsCourse;
      } else if (effectiveSpeedKmh >= LOW_SPEED_HEADING_KMH && gpsCourse !== null) {
        const t = (effectiveSpeedKmh - LOW_SPEED_HEADING_KMH) / (HIGH_SPEED_HEADING_KMH - LOW_SPEED_HEADING_KMH);
        sourceHeading = lerpAngle(compassHeading, gpsCourse, clamp(t, 0, 1));
      }

      const nextHeading = smoothHeading(smoothedHeadingRef.current, sourceHeading, alphaHeading);
      smoothedHeadingRef.current = nextHeading;
      setWorldHeading(nextHeading);
    };

    const start = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) {
        return;
      }

      headingSubscription = await Location.watchHeadingAsync((headingData) => {
        const nextHeading = headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
        if (!Number.isFinite(nextHeading)) {
          return;
        }

        compassHeadingRef.current = normalizeHeading(nextHeading);
        const { alphaHeading } = getDynamicAlphas(navigationModeRef.current);
        updateHeadingState(speedKmhRef.current, alphaHeading);
      });

      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null);

      if (cancelled || !initialLocation) {
        return;
      }

      const initialCoordinate = {
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
      };

      const initialValid =
        Number.isFinite(initialCoordinate.latitude) &&
        Number.isFinite(initialCoordinate.longitude) &&
        Math.abs(initialCoordinate.latitude) <= 90 &&
        Math.abs(initialCoordinate.longitude) <= 180;

      if (initialValid) {
        filteredCoordinateRef.current = initialCoordinate;
        hasInitialFixRef.current = true;
        setCoordinate(initialCoordinate);
        setAccuracy(initialLocation.coords.accuracy ?? null);
      }

      positionSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 500,
          distanceInterval: 0.5,
        },
        (location) => {
          const latitude = location.coords.latitude;
          const longitude = location.coords.longitude;
          const validPosition =
            Number.isFinite(latitude) &&
            Number.isFinite(longitude) &&
            Math.abs(latitude) <= 90 &&
            Math.abs(longitude) <= 180;

          if (!validPosition) {
            return;
          }

          const nextSpeedKmh = sanitizeSpeedKmh(location.coords.speed);
          const nextNavigationMode = getNavigationMode(nextSpeedKmh);
          if (navigationModeRef.current !== nextNavigationMode) {
            navigationModeRef.current = nextNavigationMode;
            setNavigationMode(nextNavigationMode);
          }

          const { alphaHeading, alphaPosition: dynamicAlphaPosition } = getDynamicAlphas(nextNavigationMode);

          const previousMotionMode = motionModeRef.current;
          const nextMotionMode: MotionMode =
            previousMotionMode === "moving"
              ? nextSpeedKmh <= STOP_MOVING_SPEED_KMH
                ? "stationary"
                : "moving"
              : nextSpeedKmh >= START_MOVING_SPEED_KMH
                ? "moving"
                : "stationary";

          if (nextMotionMode !== previousMotionMode) {
            motionModeRef.current = nextMotionMode;
            setMotionMode(nextMotionMode);
          }

          const gpsHeading = location.coords.heading;
          gpsCourseRef.current =
            gpsHeading !== null && Number.isFinite(gpsHeading) && gpsHeading >= 0
              ? normalizeHeading(gpsHeading)
              : null;

          speedKmhRef.current = nextSpeedKmh;
          setSpeedKmh(nextSpeedKmh);
          setAccuracy(location.coords.accuracy ?? null);
          updateHeadingState(nextSpeedKmh, alphaHeading);

          const rawAccuracy = location.coords.accuracy;
          if (rawAccuracy !== null && Number.isFinite(rawAccuracy) && rawAccuracy > MAX_ACCEPTED_ACCURACY_METERS) {
            return;
          }

          const rawCoordinate: LatLng = { latitude, longitude };

          if (!hasInitialFixRef.current) {
            hasInitialFixRef.current = true;
            filteredCoordinateRef.current = rawCoordinate;
            kalmanStateRef.current = updateKalmanPosition(null, {
              lat: rawCoordinate.latitude,
              lng: rawCoordinate.longitude,
              accuracy: rawAccuracy ?? null,
              timestampMs: location.timestamp,
            });
            setCoordinate(rawCoordinate);
            return;
          }

          const previousKalmanTimestamp = kalmanStateRef.current?.lastTimestampMs ?? location.timestamp;
          const kalmanNext = updateKalmanPosition(kalmanStateRef.current, {
            lat: rawCoordinate.latitude,
            lng: rawCoordinate.longitude,
            accuracy: rawAccuracy ?? null,
            timestampMs: location.timestamp,
          });
          kalmanStateRef.current = kalmanNext;

          const alphaPosition = clamp(dynamicAlphaPosition, 0.1, 0.6);
          const previousCoordinate = filteredCoordinateRef.current;
          let filteredCoordinate = {
            latitude: previousCoordinate.latitude + alphaPosition * (kalmanNext.lat - previousCoordinate.latitude),
            longitude: previousCoordinate.longitude + alphaPosition * (kalmanNext.lng - previousCoordinate.longitude),
          };

          if (nextSpeedKmh > 15) {
            const deltaTimeSeconds = Math.max(
              0.05,
              Math.min(2, (location.timestamp - previousKalmanTimestamp) / 1000)
            );
            filteredCoordinate = {
              latitude: filteredCoordinate.latitude + kalmanNext.velocityLat * deltaTimeSeconds,
              longitude: filteredCoordinate.longitude + kalmanNext.velocityLng * deltaTimeSeconds,
            };
          }

          filteredCoordinateRef.current = filteredCoordinate;
          setCoordinate(filteredCoordinate);
        }
      );
    };

    start();

    return () => {
      cancelled = true;
      if (positionSubscription) {
        positionSubscription.remove();
      }
      if (headingSubscription) {
        headingSubscription.remove();
      }
    };
  }, []);

  const navigationState = useMemo<NavigationState>(() => {
    const cameraHeading = followUser ? worldHeading : lockedCameraHeadingRef.current;
    const markerHeadingRelative = followUser ? 0 : normalizeHeading(worldHeading - cameraHeading);

    return {
      coordinate,
      speedKmh,
      motionMode,
      navigationMode,
      worldHeading,
      cameraHeading,
      markerHeadingRelative,
      accuracy,
    };
  }, [accuracy, coordinate, followUser, motionMode, navigationMode, speedKmh, worldHeading]);

  return navigationState;
}
