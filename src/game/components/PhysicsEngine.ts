import {DestroyOptions, EventEmitter} from 'pixi.js'
import {Body, Composite, Engine, Events} from 'matter-js'
import BaseNode from '$lib/BaseNode'
import {IPoint} from '$lib/Vector'

class PhysicsEngineClass extends EventEmitter {
    matter = Engine.create()
    map = new Map()
    map_s_to_n = new Map()

    constructor() {
        super()
        this.recreate()
    }


    update() {
        Engine.update(this.matter, 1000 / 60)

        for (const [node, shape] of this.map.values()) {
            node.x = shape.position.x
            node.y = shape.position.y
            node.rotation = shape.angle
        }
    }

    add(node: BaseNode, shape: Body) {
        Composite.add(this.matter.world, shape)
        this.map.set(node.slug, [node, shape])
        this.map_s_to_n.set(shape, node)
    }

    get_node(shape: Body) {
        return this.map_s_to_n.get(shape)
    }

    remove(node: BaseNode, shape: Body) {
        Composite.remove(this.matter.world, shape)
        this.map.delete(node.slug)
        this.map_s_to_n.delete(shape)
    }

    recreate() {
        this.matter = Engine.create()
        Events.on(this.matter, 'collisionStart', (event) => {
            this.emit('collisionstart', event)
        })
    }
}

export const PhysicsEngine = new PhysicsEngineClass()

export class NodePhysics extends BaseNode {
    shape!: Body

    destroy(options?: DestroyOptions) {
        PhysicsEngine.remove(this, this.shape)
        super.destroy(options)
    }

    set_position(position: Partial<IPoint>) {
        if (position.x) {
            this.x = position.x
        } else {
            position.x = this.shape.position.x
        }
        if (position.y) {
            this.y = position.y
        } else {
            position.y = this.shape.position.y
        }

        Body.setPosition(this.shape, position as any)
    }
}

