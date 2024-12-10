
export const gradient_ball_bg = ['B4B4B4', 'FFFFFF', '72EAFF', '788FFF', '6AEF59', 'D9FF00', 'FFEC15', 'F193FF', 'DC4043']
export const gradient_ball_marker = ['261E1E', '513C3C', '245E7B', '19115C', '115C1A', '566117', '4A4023', '510957', '3F2222']

export const calc_percent = (min: number, max: number, percent: number) => {
    const range = max - min
    const result = range * percent + min
    return result
}

export function calc_in_range(min: number, max: number, value: number): number {
    if (min === max) {
        throw new Error("Min and max cannot be the same value.");
    }

    // Clamp the value to ensure it lies within the range
    const clampedValue = Math.max(min, Math.min(max, value));

    // Calculate the percentage
    const percent = ((clampedValue - min) / (max - min));

    return percent;
}

export function find_x(y: number) { // 216 e^0.444x
    if (y <= 0) {
        throw new Error("y must be greater than 0");
    }
    const x = Math.log(y / 216) / 0.444;
    return x;
}

export const get_gradient_color = (value: number, colors: string[]) => {

    const start_index = Math.floor(value * (colors.length - 1))
    const end_index = Math.min(start_index + 1, colors.length - 1)
    const ratio = value * (colors.length - 1) - start_index

    const interpolate = (start: number, end: number, factor: number) => Math.round(start + (end - start) * factor)
    const hex_to_rgb = (hex: string) => ({
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
    })
    const rgb_to_int = (rgb: any) => (rgb.r << 16) | (rgb.g << 8) | rgb.b

    const start_rgb = hex_to_rgb(colors[start_index])
    const end_rgb = hex_to_rgb(colors[end_index])

    const result_rgb = {
        r: interpolate(start_rgb.r, end_rgb.r, ratio),
        g: interpolate(start_rgb.g, end_rgb.g, ratio),
        b: interpolate(start_rgb.b, end_rgb.b, ratio),
    }

    return rgb_to_int(result_rgb)
}
