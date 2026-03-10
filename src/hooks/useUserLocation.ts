import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

export type UserLocationState = {
  status: "loading" | "ready" | "permission-denied" | "error";
  coordinate: { latitude: number; longitude: number } | null;
  accuracy: number | null;
  speedKmh: number;
  heading: number;
  errorMessage?: string;
};

const MAX_ACCEPTED_ACCURACY_METERS = 50;
const HEADING_SMOOTHING_ALPHA = 0.2;
const GPS_COURSE_MIN_SPEED_KMH = 6;

function normalizeHeading(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function angleDelta(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

function smoothHeading(previous: number, next: number) {
  const delta = angleDelta(previous, next);
  return normalizeHeading(previous + HEADING_SMOOTHING_ALPHA * delta);
}

function sanitizeGpsCourseHeading(heading: number | null) {
  if (heading === null || !Number.isFinite(heading) || heading < 0) {
    return null;
  }

  return normalizeHeading(heading);
}

function sanitizeSpeedKmh(speedMps: number | null) {
  if (speedMps === null || !Number.isFinite(speedMps)) {
    return 0;
  }

  return Math.max(0, speedMps * 3.6);
}

export function useUserLocation(): UserLocationState {
  const [state, setState] = useState<UserLocationState>({
    status: "loading",
    coordinate: null,
    accuracy: null,
    speedKmh: 0,
    heading: 0,
  });

  const compassHeadingRef = useRef(0);
  const gpsCourseHeadingRef = useRef<number | null>(null);
  const speedKmhRef = useRef(0);
  const smoothedHeadingRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let positionSubscription: Location.LocationSubscription | null = null;
    let headingSubscription: Location.LocationSubscription | null = null;

    const computeSourceHeading = () => {
      if (speedKmhRef.current >= GPS_COURSE_MIN_SPEED_KMH && gpsCourseHeadingRef.current !== null) {
        return gpsCourseHeadingRef.current;
      }

      return compassHeadingRef.current;
    };

    const updateHeadingState = () => {
      const sourceHeading = computeSourceHeading();
      const nextSmoothed = smoothHeading(smoothedHeadingRef.current, sourceHeading);
      smoothedHeadingRef.current = nextSmoothed;

      setState((previous) => ({
        ...previous,
        heading: nextSmoothed,
      }));
    };

    const start = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (cancelled) {
          return;
        }

        if (status !== "granted") {
          setState({
            status: "permission-denied",
            coordinate: null,
            accuracy: null,
            speedKmh: 0,
            heading: 0,
            errorMessage: "Permissao de localizacao negada.",
          });
          return;
        }

        headingSubscription = await Location.watchHeadingAsync((headingData) => {
          if (cancelled) {
            return;
          }

          const nextHeading = headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
          if (!Number.isFinite(nextHeading)) {
            return;
          }

          compassHeadingRef.current = normalizeHeading(nextHeading);
          updateHeadingState();
        });

        const bootstrap = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null);

        if (!cancelled && bootstrap) {
          const bootstrapAccuracy = bootstrap.coords.accuracy ?? null;
          const bootstrapCoordinate = {
            latitude: bootstrap.coords.latitude,
            longitude: bootstrap.coords.longitude,
          };

          const validCoordinate =
            Number.isFinite(bootstrapCoordinate.latitude) &&
            Number.isFinite(bootstrapCoordinate.longitude) &&
            Math.abs(bootstrapCoordinate.latitude) <= 90 &&
            Math.abs(bootstrapCoordinate.longitude) <= 180;

          const acceptedAccuracy =
            bootstrapAccuracy === null ||
            (Number.isFinite(bootstrapAccuracy) && bootstrapAccuracy <= MAX_ACCEPTED_ACCURACY_METERS);

          if (validCoordinate && acceptedAccuracy) {
            setState((previous) => ({
              ...previous,
              status: "ready",
              coordinate: bootstrapCoordinate,
              accuracy: bootstrapAccuracy,
              speedKmh: sanitizeSpeedKmh(bootstrap.coords.speed),
            }));

            speedKmhRef.current = sanitizeSpeedKmh(bootstrap.coords.speed);
            gpsCourseHeadingRef.current = sanitizeGpsCourseHeading(bootstrap.coords.heading);
            updateHeadingState();
          }
        }

        positionSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (location) => {
            if (cancelled) {
              return;
            }

            const nextAccuracy = location.coords.accuracy ?? null;
            if (nextAccuracy !== null && Number.isFinite(nextAccuracy) && nextAccuracy > MAX_ACCEPTED_ACCURACY_METERS) {
              return;
            }

            const nextCoordinate = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };

            const validCoordinate =
              Number.isFinite(nextCoordinate.latitude) &&
              Number.isFinite(nextCoordinate.longitude) &&
              Math.abs(nextCoordinate.latitude) <= 90 &&
              Math.abs(nextCoordinate.longitude) <= 180;

            if (!validCoordinate) {
              return;
            }

            const nextSpeedKmh = sanitizeSpeedKmh(location.coords.speed);
            speedKmhRef.current = nextSpeedKmh;
            gpsCourseHeadingRef.current = sanitizeGpsCourseHeading(location.coords.heading);
            updateHeadingState();

            setState((previous) => ({
              ...previous,
              status: "ready",
              coordinate: nextCoordinate,
              accuracy: nextAccuracy,
              speedKmh: nextSpeedKmh,
            }));
          }
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          coordinate: null,
          accuracy: null,
          speedKmh: 0,
          heading: 0,
          errorMessage: error instanceof Error ? error.message : "Erro ao obter localizacao.",
        });
      }
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

  return state;
}
