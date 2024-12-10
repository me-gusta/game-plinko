import SceneSwitch from '$lib/SceneSwitch'
import dev from '$src/game/dev'
import BaseNode from '$lib/BaseNode'
import {graphics} from '$lib/create_things'
import S_test_mechanics from '$src/game/scenes/S_test_mechanics'
import S_Room from '$src/game/scenes/S_Room'

class BtnSwitch extends BaseNode {
    bg = graphics().rect(-30, -30, 60, 60).fill('white')

    constructor() {
        super()
        this.addChild(this.bg)
    }
}

export default class Scene extends SceneSwitch {
    // @ts-ignore
    scenes: Map<string, any> = new Map([
        // ['plinko', S_test_mechanics],
        ['room', S_Room],
    ])
    initial = 'room'
    btnSwitch = new BtnSwitch()

    constructor() {
        super()
        this.addChild(this.btnSwitch)
        this.btnSwitch.zIndex = 1

        this.btnSwitch.interactive = true
        this.btnSwitch.on('pointerdown', () => {
            if (this.current_name === 'touch') this.emit('set_scene', 'farm')
            else if (this.current_name === 'farm') this.emit('set_scene', 'plinko')
            else if (this.current_name === 'plinko') this.emit('set_scene', 'farm')
        })
    }


    resize() {
        const {height, width} = window.screen_size
        this.btnSwitch.position.y = -height * 0.5 + 30
        this.btnSwitch.position.x = width * 0.5 - 30
        super.resize();
    }
}
