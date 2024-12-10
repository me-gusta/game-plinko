import BaseNode from '$lib/BaseNode'

export default class Loop {
    private timeoutId
    private timeout
    time
    private fn
    private node: BaseNode
    constructor(node:BaseNode, time: number, fn: () => void) {
        this.timeout = () => {
            this.timeoutId = node.set_timeout(this.time, this.timeout.bind(this))
            fn()
        }
        this.fn = fn
        this.time = time
        this.timeoutId = -1
        this.node = node
    }

    get isStarted() {
        return this.timeoutId !== -1
    }

    start(instant = false) {
        if (instant) this.fn()
        this.node.clear_timeout(this.timeoutId)
        this.timeoutId = this.node.set_timeout(this.time, this.timeout.bind(this))
    }

    startIfNot(instant = false) {
        if (this.isStarted) return

        this.start(instant)
    }

    stop = () => {
        this.node.clear_timeout(this.timeoutId)
        this.timeoutId = -1
        console.log('sad')
    }
}
