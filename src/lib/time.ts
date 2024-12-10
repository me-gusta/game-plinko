const timers: Map<number, any> = new Map()

let timer_id = 1
let seconds_total = 0

export const set_timeout = (
    duration: number,
    fn: () => void,
): number => {
    timers.set(timer_id, {
        id: timer_id,
        duration,
        fn,
        at: seconds_total,
    })

    return timer_id++
}

export const clear_timeout = (id: number) => {
    timers.delete(id)
}

export const process_timers = (time_data: any) => {
    seconds_total += time_data.deltaMS
    for (const timer of timers.values()) {
        if (timer.at + timer.duration <= seconds_total) {
            timer.fn()
            timers.delete(timer.id)
        }
    }
}
