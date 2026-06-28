/**
 * Haversine formula to calculate the great-circle distance between two points
 * on a sphere given their longitudes and latitudes.
 * 
 * @param lat1 Latitude of point 1 in decimal degrees
 * @param lon1 Longitude of point 1 in decimal degrees
 * @param lat2 Latitude of point 2 in decimal degrees
 * @param lon2 Longitude of point 2 in decimal degrees
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Find the delivery fee based on distance and distance tiers
 * 
 * @param distance Distance in kilometers
 * @param rules Array of { max_dist: number, fee: number }
 * @returns Delivery fee
 */
export function getDeliveryFee(distance: number, rules: { max_dist: number, fee: number }[]): number {
  if (!rules || rules.length === 0) return 0;
  
  // Sort rules by distance ascending
  const sortedRules = [...rules].sort((a, b) => a.max_dist - b.max_dist);
  
  // Find the first tier that accommodates the distance
  for (const rule of sortedRules) {
    if (distance <= rule.max_dist) {
      return rule.fee;
    }
  }
  
  // If beyond last tier, it means OUT OF SERVICE AREA. Return -1 to indicate this.
  return -1;
}

/**
 * Check if a coordinate is within a certain radius of another coordinate
 * 
 * @param lat1 Current latitude
 * @param lon1 Current longitude
 * @param lat2 Target latitude
 * @param lon2 Target longitude
 * @param radiusMeters Radius in meters
 * @returns boolean
 */
export function isWithinRange(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  return (distance * 1000) <= radiusMeters;
}
