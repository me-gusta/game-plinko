import BaseNode from '$lib/BaseNode'
import {Body, Composite, Engine, Bodies, Events, Vector} from 'matter-js'
import {
    Container,
    DestroyOptions,
    EventEmitter,
    Graphics,
    Ticker,
    Text,
    Point,
    Texture,
    ParticleContainer,
} from 'pixi.js'
import {create_sprite, create_text, graphics} from '$lib/create_things'
import {h_const, w_const} from '$lib/resize'
import {random_int} from '$lib/random'
import Loop from '$lib/Loop'
import {calculate_bumper_level} from '$src/game/utility'
import {NodePhysics, PhysicsEngine} from '$src/game/components/PhysicsEngine'
import {IPoint} from '$lib/Vector'
import registerKeypress from '$lib/dev/registerKeypress'
import {Pane} from 'tweakpane'
import {Emitter, upgradeConfig} from '@barvynkoa/particle-emitter'
import emitter_configs from '$src/emitters'
import {calc_percent, gradient_ball_bg, gradient_ball_marker, get_gradient_color} from '$src/game/logica/gradients'


const particles = new Container()

type EmitterConfigs = 'star' | 'dust' | 'trail' | 'flare'

class Ball extends NodePhysics {
    color = graphics().circle(0, 0, 70).fill({color: '#ec9f9f', alpha: 1})
    bg = create_sprite('ball')
    level = 1
    marker: Text
    container = new Container()
    emitter: Emitter
    emitter_current: EmitterConfigs = 'trail'

    constructor() {
        super()

        this.marker = create_text({text: this.level, style: {fontSize: 80, fill: '#317a0b', fontFamily: 'bubblebody'}})
        this.marker.anchor.y = 0.55

        this.addChild(this.container)
        this.container.addChild(this.bg)
        this.container.addChild(this.color)
        this.container.addChild(this.marker)
        this.container.scale.set(0.5)
        this.color.blendMode = 'multiply'

        this.emitter = new Emitter(particles, upgradeConfig(emitter_configs.trail, [Texture.from('particle')]))


        setTimeout(() => {
            this.emitter.spawnPos.copyFrom(this.position)

            window.app.ticker.add(() => {
                this.emitter.update(0.01)
            })
        }, 100)

        let go_down = true
        setTimeout(() => {
            setInterval(() => {
                if (this.y > 1000) go_down = false
                if (this.y < 800) go_down = true

                if (go_down) {
                    this.y += 5
                } else {
                    this.y -= 5
                }

                this.emitter.spawnPos.copyFrom(this.position)


            }, 1)
        }, 110)
    }

    upgrade(value: number) {
        this.level = Math.floor(value)
        if (value < 1000) this.marker.text = this.level
        else this.marker.text = `${(this.level / 1000).toFixed(1)}k`
    }

    set_emitter(name?: EmitterConfigs) {
        if (name === undefined) {
            this.emitter.emit = false
            return
        }
        if (this.emitter_current === name && this.emitter.emit) return
        this.emitter_current = name
        this.emitter.init(upgradeConfig(emitter_configs[name], [Texture.from('particle')]))
        this.emitter.spawnPos.copyFrom(this.position)
        this.emitter.emit = true
    }
}

export default class S_test_ball_colors extends BaseNode {
    bg = graphics().rect(0, 0, 1, 1).fill(0x2E2E2F)
    ball = new Ball()

    constructor() {
        super()
        this.addChild(this.bg)
        this.addChild(particles)
        this.addChild(this.ball)

        const pane: any = new Pane()

        const min = 1
        const max = 1300

        const base = {
            value: 0.1,
        }


        const binding = pane.addBinding(
            base, 'value',
            {min: 0, max: 1, step: 0.01},
        )
        binding.on('change', (event: any) => {
            // this.ball.tint = event.value
            const value = event.value
            const g = get_gradient_color(value, gradient_ball_bg)
            // this.ball.tint = g
            this.ball.color.clear().circle(0, 0, 70).fill({color: g, alpha: 1})
            this.ball.marker.style.fill = get_gradient_color(value, gradient_ball_marker)

            this.ball.upgrade(calc_percent(min, max, value))

            if (value > 0.85) {
                this.ball.set_emitter('star')
            } else if (value > 0.7) {
                this.ball.set_emitter('flare')
            } else if (value > 0.45) {
                this.ball.set_emitter('dust')
            } else if (value > 0.2) {
                this.ball.set_emitter('trail')
            } else {
                this.ball.set_emitter()
            }
        })

    }

    start() {

    }

    resize() {
        super.resize()
        const {width, height} = window.screen_size

        this.position.set(-width * 0.5, -height * 0.5)
        this.bw = width
        this.bh = height

        this.ball.position.x = this.bw * 0.5
        this.ball.position.y = this.bh * 0.5

        this.bg.width = this.bw
        this.bg.height = this.bh
    }
}
