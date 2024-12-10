import BaseNode from '$lib/BaseNode'

export default class SceneSwitch extends BaseNode {
    scenes: Map<string, any> = new Map([ // string <-> {start(), resize()}
    ])
    current_name = ''
    current: any
    initial = ''

    // export-trigger set_scene

    constructor() {
        super()

        this.on('set_scene', (which: string) => {
            this.unmount_scene()
            this.set_scene(which)
            this.current.resize()
            this.current.start()
        })
    }

    start() {
        this.current.start()
    }

    init() {
        this.set_scene(this.initial)
    }

    unmount_scene() {
        if (!this.current) return
        this.current.destroy()
    }

    set_scene(name: string) {
        const Init = this.scenes.get(name)!

        this.current = new Init()
        this.addChild(this.current)
        this.current_name = name
    }

    resize() {
        if (!this.current) this.init()

        this.current.resize()
    }
}
