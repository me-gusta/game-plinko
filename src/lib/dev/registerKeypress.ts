import { IS_DEBUG } from '$lib/env'

export default (key: string, action: () => void) => {
    if (!IS_DEBUG) return
    window.addEventListener('keydown', (e) => {
        if (e.key === key) action()
    })
}
