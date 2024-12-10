export function random_int(min: number, max: number) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

export function random_float(min: number = 0, max: number = 1) {
    return Math.random() * (max - min) + min
}

export function random_choice(items: any[]) {
    return items[Math.floor(Math.random() * items.length)]
}

export const shuffle_array = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = array[j]
        array[j] = array[i]
        array[i] = tmp
    }
    return array
}
