export type KalmanState = {
  lat: number;
  lng: number;
  velocityLat: number;
  velocityLng: number;
  covarianceLat: number;
  covarianceLng: number;
  lastTimestampMs: number;
};

export type KalmanMeasurement = {
  lat: number;
  lng: number;
  accuracy: number | null;
  timestampMs: number;
};

const PROCESS_NOISE_Q = 0.00001;

function accuracyToMeasurementNoise(accuracyMeters: number | null) {
  if (accuracyMeters === null || !Number.isFinite(accuracyMeters)) {
    return 0.0002;
  }

  if (accuracyMeters < 10) {
    return 0.00005;
  }

  if (accuracyMeters > 30) {
    return 0.0007;
  }

  return 0.0002;
}

export function updateKalmanPosition(
  prevState: KalmanState | null,
  measurement: KalmanMeasurement
): KalmanState {
  if (!prevState) {
    return {
      lat: measurement.lat,
      lng: measurement.lng,
      velocityLat: 0,
      velocityLng: 0,
      covarianceLat: 1,
      covarianceLng: 1,
      lastTimestampMs: measurement.timestampMs,
    };
  }

  const deltaSecondsRaw = (measurement.timestampMs - prevState.lastTimestampMs) / 1000;
  const deltaSeconds = Math.max(0.05, Math.min(2, Number.isFinite(deltaSecondsRaw) ? deltaSecondsRaw : 0.5));

  const predictedLat = prevState.lat + prevState.velocityLat * deltaSeconds;
  const predictedLng = prevState.lng + prevState.velocityLng * deltaSeconds;

  const predictedCovLat = prevState.covarianceLat + PROCESS_NOISE_Q;
  const predictedCovLng = prevState.covarianceLng + PROCESS_NOISE_Q;

  const measurementNoise = accuracyToMeasurementNoise(measurement.accuracy);

  const kalmanGainLat = predictedCovLat / (predictedCovLat + measurementNoise);
  const kalmanGainLng = predictedCovLng / (predictedCovLng + measurementNoise);

  const nextLat = predictedLat + kalmanGainLat * (measurement.lat - predictedLat);
  const nextLng = predictedLng + kalmanGainLng * (measurement.lng - predictedLng);

  const measuredVelocityLat = (nextLat - prevState.lat) / deltaSeconds;
  const measuredVelocityLng = (nextLng - prevState.lng) / deltaSeconds;

  return {
    lat: nextLat,
    lng: nextLng,
    velocityLat: prevState.velocityLat * 0.6 + measuredVelocityLat * 0.4,
    velocityLng: prevState.velocityLng * 0.6 + measuredVelocityLng * 0.4,
    covarianceLat: (1 - kalmanGainLat) * predictedCovLat,
    covarianceLng: (1 - kalmanGainLng) * predictedCovLng,
    lastTimestampMs: measurement.timestampMs,
  };
}
