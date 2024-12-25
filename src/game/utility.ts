import {IPoint} from '$lib/Vector'
import {random_choice} from '$lib/random'

export const merge_objects = (obj1: any, obj2: any) => {
    const merged = {...obj1}  // Start with all keys from obj1

    for (const key in obj2) {
        if (Array.isArray(obj2[key]) && Array.isArray(obj1[key])) {
            // Merge arrays if both objects have the key with array values
            merged[key] = [...obj1[key], ...obj2[key]]
        } else {
            // Otherwise, just take the value from obj2 (it might be a new key or a non-array)
            merged[key] = obj2[key]
        }
    }

    return merged
}

export function randomPointInCircle(center: IPoint, radius: number) {
    // Generate a random angle in radians
    const angle = Math.random() * 2 * Math.PI;

    // Generate a random radius, with square root to ensure uniform distribution
    const r = Math.sqrt(Math.random()) * radius;

    // Convert polar coordinates to Cartesian coordinates and offset by center
    const x = center.x + r * Math.cos(angle);
    const y = center.y + r * Math.sin(angle);

    return {x, y};
}

export function isPointInCircle(circlePosition: IPoint, radius: number, pointPosition: IPoint) {
    // Calculate the distance between the circle's center and the point
    const dx = pointPosition.x - circlePosition.x;
    const dy = pointPosition.y - circlePosition.y;
    const distanceSquared = dx * dx + dy * dy;

    // Check if the distance is less than or equal to the square of the radius
    return distanceSquared <= radius * radius;
}

export function calculate_bumper_level(stats: any) {
    if (Object.keys(stats).length === 0) {
        return 1
    }

    return Number(random_choice(Object.keys(stats)))
}

export const detect_circle_intersection = (pos_a: { x: number, y: number }, radius_a: number, pos_b: { x: number, y: number }, radius_b: number): boolean => {
    const distance = Math.sqrt((pos_b.x - pos_a.x) ** 2 + (pos_b.y - pos_a.y) ** 2)
    return distance < radius_a + radius_b
}

export function mapRange(value:number, inputMin:number, inputMax:number, targetMin:number, targetMax:number) {
    // Map the value proportionally from the input range to the target range
    return targetMin + (value - inputMin) * (targetMax - targetMin) / (inputMax - inputMin);
}

export const pretty_n = (n: number) => {
    if (n > 1000000) {
        return Math.floor(n / 100000) + 'M'
    } else if (n > 10000) {
        return Math.floor(n / 1000) + 'k'
    } else if (n > 1000) {
        return (n / 1000).toFixed(1) + 'k'
    } else return  n.toString()
}
