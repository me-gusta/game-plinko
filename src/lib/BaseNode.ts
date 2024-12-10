import {Container, DestroyOptions} from 'pixi.js'
import {Easing, Group, Tween} from '@tweenjs/tween.js'
import {clear_timeout, set_timeout} from '$lib/time'

type UnknownProps = Record<string, any>;

let e_id = 0

export const time_groups = new Map()
// export const time_timers = new Map()

export default class BaseNode extends Container {
    bw = 0
    bh = 0

    // tween_group?: Group
    // timers?: number[]
    tween_group = new Group()
    timers = new Set<number>()

    slug = ''

    constructor() {
        super()

        this.slug = `${this.constructor.name}-${e_id++}`

        // console.log(this.slug)
        time_groups.set(this.slug, this.tween_group)
    }

    resize() {
    }

    onResize(width: number, height: number) {
        this.resize()
    }

    tween<T extends UnknownProps>(object: T) {
        const tw = new Tween(object)
        tw.easing(Easing.Quadratic.InOut)
        this.tween_group.add(tw)
        return tw
    }

    set_timeout(duration: number, fn: () => void) {
        const id = set_timeout(duration, fn)
        this.timers.add(id)
        return id
    }

    clear_timeout(id: number) {
        clear_timeout(id)
        this.timers.delete(id)
    }

    destroy(options?: DestroyOptions) {
        for (const id of this.timers.values()) {
            clear_timeout(id)
        }
        this.tween_group.removeAll()
        time_groups.delete(this.slug)
        super.destroy(options)
    }

    trigger(name: string, ...args: any[]) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let obj: any = this
        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (obj.eventNames().includes(name)) {
                obj.emit(name, ...args)
                return
            }
            obj = obj.parent
            if (!obj) {
                return
            }
        }
    }
}
