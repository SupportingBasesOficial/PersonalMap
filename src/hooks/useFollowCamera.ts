import { useCallback, useEffect, useRef } from "react";
import MapView, { type LatLng } from "react-native-maps";

type Params = {
  followUser: boolean;
  setFollowUser: (value: boolean) => void;
  coordinate: LatLng | null;
  worldHeading: number;
  status: "loading" | "ready" | "permission-denied" | "error";
};

const DEFAULT_COORDINATE: LatLng = {
  latitude: -23.55052,
  longitude: -46.633308,
};

const MIN_CAMERA_MOVE_METERS = 1;
const MIN_CAMERA_HEADING_DELTA_DEGREES = 1;

function approximateDistanceMeters(a: LatLng, b: LatLng) {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = 111_320 * Math.cos(((a.latitude + b.latitude) / 2) * (Math.PI / 180));
  const dLat = (a.latitude - b.latitude) * metersPerDegreeLat;
  const dLng = (a.longitude - b.longitude) * metersPerDegreeLng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function angleDelta(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

export function useFollowCamera(params: Params) {
  const { followUser, setFollowUser, coordinate, worldHeading, status } = params;

  const mapRef = useRef<MapView | null>(null);
  const lastCameraCenterRef = useRef<LatLng>(DEFAULT_COORDINATE);
  const lastCameraHeadingRef = useRef(0);

  useEffect(() => {
    if (!followUser || status !== "ready" || !coordinate) {
      return;
    }

    const movedMeters = approximateDistanceMeters(coordinate, lastCameraCenterRef.current);
    const headingDelta = Math.abs(angleDelta(worldHeading, lastCameraHeadingRef.current));

    if (movedMeters < MIN_CAMERA_MOVE_METERS && headingDelta < MIN_CAMERA_HEADING_DELTA_DEGREES) {
      return;
    }

    lastCameraCenterRef.current = coordinate;
    lastCameraHeadingRef.current = worldHeading;
    mapRef.current?.animateCamera(
      {
        center: coordinate,
        heading: worldHeading,
        pitch: 0,
        zoom: 18,
      },
      { duration: 120 }
    );
  }, [coordinate, followUser, status, worldHeading]);

  const handlePanDrag = useCallback(() => {
    setFollowUser(false);
  }, [setFollowUser]);

  const handleRecenter = useCallback(() => {
    if (status !== "ready" || !coordinate) {
      return;
    }

    setFollowUser(true);
    lastCameraCenterRef.current = coordinate;
    lastCameraHeadingRef.current = worldHeading;

    mapRef.current?.animateCamera(
      {
        center: coordinate,
        heading: worldHeading,
        pitch: 0,
        zoom: 18,
      },
      { duration: 220 }
    );
  }, [coordinate, setFollowUser, status, worldHeading]);

  return {
    mapRef,
    handlePanDrag,
    handleRecenter,
  };
}