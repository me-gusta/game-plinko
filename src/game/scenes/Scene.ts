import SceneSwitch from '$lib/SceneSwitch'
import dev from '$src/game/dev'
import BaseNode from '$lib/BaseNode'
import {graphics} from '$lib/create_things'
import S_test_mechanics from '$src/game/scenes/S_test_mechanics'
import S_Room from '$src/game/scenes/S_Room'
import S_Pause from '$src/game/scenes/S_Pause'

class BtnSwitch extends BaseNode {
    bg = graphics().rect(-30, -30, 60, 60).fill('white')

    constructor() {
        super()
    }
}

export default class Scene extends SceneSwitch {
    // @ts-ignore
    scenes: Map<string, any> = new Map([
        // ['plinko', S_test_mechanics],
        ['room', S_Room],
    ])
    pause = new S_Pause()
    initial = 'room'

    constructor() {
        super()

        this.on('enable_pause', () => {
            this.pause.visible = true

        })
        this.addChild(this.pause)
        this.pause.zIndex = 10
    }


    resize() {
        super.resize();
        this.pause.resize()
    }
}
