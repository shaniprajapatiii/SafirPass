import { NextResponse } from "next/server";
import { getAllGeofences } from "@/lib/db/postgres";
import { getSession } from "@/lib/jwt";

/**
 * Computes Haversine distance in meters between two coordinates.
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export async function POST(request) {
  try {
    const session = await getSession(request);
    const body = await request.json().catch(() => ({}));
    const { latitude, longitude, speed_kph } = body;

    if (latitude == null || longitude == null || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      return NextResponse.json(
        { error: "Valid latitude and longitude coordinates are required for geofence check." },
        { status: 400 }
      );
    }

    const touristLat = Number(latitude);
    const touristLng = Number(longitude);
    const touristSpeed = Number(speed_kph || 0);

    const geofences = await getAllGeofences();

    let insideAlert = null;
    let approachingAlert = null;
    const evaluatedGeofences = [];

    for (const gf of geofences) {
      if (gf.latitude == null || gf.longitude == null) continue;
      const distanceMeters = calculateHaversineDistance(
        touristLat,
        touristLng,
        Number(gf.latitude),
        Number(gf.longitude)
      );

      const radius = Number(gf.radius_meters || 800);
      const isInside = distanceMeters <= radius;
      const isApproaching = !isInside && distanceMeters <= radius + 1500;

      const item = {
        id: gf.id,
        name: gf.name,
        category: gf.category,
        distanceMeters,
        distanceKm: (distanceMeters / 1000).toFixed(2),
        radiusMeters: radius,
        description: gf.description,
        safetyAdvisory: gf.safety_advisory || gf.description,
        isInside,
        isApproaching,
      };

      evaluatedGeofences.push(item);

      if (isInside && !insideAlert) {
        insideAlert = item;
      } else if (isApproaching && !approachingAlert) {
        approachingAlert = item;
      }
    }

    // Sort by proximity
    evaluatedGeofences.sort((a, b) => a.distanceMeters - b.distanceMeters);

    // Evaluate speed anomaly
    const isSpeedAnomaly = touristSpeed > 130;

    let overallStatus = "SAFE";
    let activeAlert = null;

    if (insideAlert) {
      overallStatus = insideAlert.category === "restricted" ? "RESTRICTED" : "WARNING";
      activeAlert = {
        type: "INSIDE_GEOFENCE",
        level: insideAlert.category === "restricted" ? "CRITICAL" : "HIGH",
        title: `Entered ${insideAlert.name}`,
        message: insideAlert.safetyAdvisory,
        geofence: insideAlert,
        emergencyNumber: "112 / 1363",
      };
    } else if (approachingAlert) {
      overallStatus = "ADVISORY";
      activeAlert = {
        type: "APPROACHING_GEOFENCE",
        level: "ADVISORY",
        title: `Approaching ${approachingAlert.name}`,
        message: `You are ${(approachingAlert.distanceMeters / 1000).toFixed(1)} km away. ${approachingAlert.safetyAdvisory}`,
        geofence: approachingAlert,
        emergencyNumber: "1363",
      };
    }

    return NextResponse.json({
      success: true,
      touristLocation: {
        latitude: touristLat,
        longitude: touristLng,
        speedKph: touristSpeed,
      },
      overallStatus,
      insideGeofence: Boolean(insideAlert),
      activeAlert,
      nearestGeofence: evaluatedGeofences[0] || null,
      proximityGeofences: evaluatedGeofences.slice(0, 5),
      anomalyDetected: isSpeedAnomaly,
    });
  } catch (err) {
    console.error("[Geofence Check Route Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process geofence check." },
      { status: 500 }
    );
  }
}
