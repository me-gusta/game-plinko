/* eslint-disable */
import BaseNode from '$lib/BaseNode'
import {Body, Composite, Engine, Bodies, Events, Vector} from 'matter-js'
import {
    Container,
    DestroyOptions,
    Graphics,
    Ticker,
    Text,
    Point,
    BlurFilter,
    ColorMatrixFilter,
    TilingSprite, Texture, Sprite, AnimatedSprite, EventEmitter,
} from 'pixi.js'
import {create_sprite, create_text, graphics, new_point} from '$lib/create_things'
import {h_const, w_const} from '$lib/resize'
import {random_choice, random_float, random_int} from '$lib/random'
import Loop from '$lib/Loop'
import {NodePhysics, PhysicsEngine} from '$src/game/components/PhysicsEngine'
import registerKeypress from '$lib/dev/registerKeypress'
import {Pane} from 'tweakpane'
import colors from '$src/game/colors'
import {Emitter, upgradeConfig} from '@barvynkoa/particle-emitter'
import emitter_configs from '$src/emitters'
import {
    calc_in_range,
    calc_percent,
    find_x,
    get_gradient_color,
    gradient_ball_bg,
    gradient_ball_marker,
} from '$src/game/logica/gradients'
import {Easing} from '@tweenjs/tween.js'
import AssetManager from '$lib/AssetManager'
import make_draggable from '$lib/make_draggable'
import {detect_circle_intersection, mapRange, randomPointInCircle, pretty_n} from '$src/game/utility'
import {IPoint} from '$lib/Vector'
import microManage from '$lib/dev/microManage'
import {renderToTexture} from '$lib/utility'
import AudioManager from '$lib/AudioManager'
import {TARGET_SCREEN} from '$lib/utility'
import Value from '$lib/Value'
import {settings} from '$src/game/logica/data'
import i18n from '$lib/i18n'


const coins = new Value(0)

const stats_bumpers: Bumper[] = []

const bumper_probabilities: any = {// max-level => [probs]
    1: [1000],
    2: [1000],
    3: [900, 100],
    4: [810, 145, 45],
    5: [729, 172, 72, 27],
    6: [656, 190, 90, 45, 18],
    7: [590, 203, 103, 58, 31, 13],
    8: [531, 213, 113, 68, 41, 22, 9],
    9: [478, 220, 120, 75, 48, 30, 17, 7],
    10: [430, 226, 126, 81, 54, 36, 23, 13, 5],
    11: [387, 231, 131, 86, 59, 41, 28, 18, 10, 4],
    12: [348, 235, 135, 90, 63, 45, 32, 22, 14, 8, 3],
}


const bumper_values: any = {
    add: {
        1: 1,
        2: 2,
        3: 4,
        4: 8,
        5: 16,
        6: 32,
        7: 64,
        8: 128,
        9: 256,
        10: 512,
        11: 1024,
        12: 2048,
        13: 4096,
    },
    multiply: {
        1: 1.2,
        2: 1.3,
        3: 1.4,
        4: 1.5,
        5: 1.6,
        6: 1.7,
        7: 1.8,
        8: 1.9,
        9: 2,
        10: 2.2,
        11: 2.4,
        12: 2.8,
    },
}

let last_20: any[] = [100]

let room!: S_Room

const particles_container = new Container()

type EmitterConfigs = 'star' | 'dust' | 'trail' | 'flare'

let pole!: Pole

const fixers: Fixer[] = []
const fixers_bought: number[] = [5, 2]
const fixers_disable = () => {
    for (const fixer of fixers) {
        fixer.anim_end()
    }
}
const fixers_enable = () => {
    for (const fixer of fixers) {
        fixer.anim_start()
    }
}
let bumpers: Bumper[] = []

const merge_cells: MergeCell[] = []
let merge_panel!: MergePanel

const fixer_prices: any = {
    3: 100,
    1: 2500,
    4: 85000,
    0: 700000,
}

const map_level = new Value(1)

const create_fx = (name: string, pos_global: IPoint) => {
    const pos = room.toLocal(pos_global)
    const textures = AssetManager.get(name)
    const sprite = new AnimatedSprite(textures)
    sprite.texture.source.scaleMode = 'nearest'
    sprite.loop = false
    sprite.position.copyFrom(pos)
    room.addChild(sprite)
    sprite.animationSpeed = 0.8
    sprite.onFrameChange = (n: number) => {
        if (n === textures.length - 1) sprite.destroy()
    }
    sprite.anchor.set(0.5)
    sprite.scale.set(4)
    sprite.gotoAndPlay(0)
    return sprite
}


class Ball extends NodePhysics {
    color = graphics().circle(0, 0, 70).fill({color: '#ec9f9f', alpha: 1})
    bg = create_sprite('ball')
    level = update_cash.value()
    marker: Text
    container = new Container()
    // emitter: Emitter
    emitter_current: EmitterConfigs = 'trail'
    shape = Bodies.circle(0, 0, 15, {
        restitution: 0.9,
        friction: 0.33,
        collisionFilter: {
            group: -1,
        },
        label: 'ball',
        slop: 0.01,
    })
    counted = false
    // flicker = create_sprite('particle')

    // update

    constructor(bonus?: string) {
        super()

        this.marker = create_text({text: this.level, style: {fontSize: 80, fill: '#317a0b', fontFamily: 'bubblebody'}})
        this.marker.anchor.y = 0.55

        this.addChild(this.container)
        this.container.addChild(this.bg)
        this.container.addChild(this.color)
        this.container.addChild(this.marker)
        this.container.scale.set(30 / this.bg.width)
        this.color.blendMode = 'multiply'

        // this.emitter = new Emitter(particles_container, upgradeConfig(emitter_configs.trail, [Texture.from('particle')]))
        // this.emitter.emit = false
        // this.update = (() => {
        //     this.emitter.spawnPos.copyFrom(this.position)
        //     this.emitter.update(0.01)
        // })

        PhysicsEngine.add(this, this.shape)
        this.set_value()

        // if (bonus) {
        //
        //     this.marker.alpha = 0
        //     this.counted = true
        //     this.addChild(this.flicker)
        //     this.flicker.scale.set(2)
        //     this.tween(this.flicker)
        //         .to({alpha: 0}, 155)
        //         .easing(Easing.Sinusoidal.InOut)
        //         .repeat(Infinity)
        //         .yoyo(true)
        //         .start()
        //     this.bg.scale.set(2.5)
        //
        //     this.cursor = 'pointer'
        // }

        // if (bonus === 'super') {
        //     const t = Texture.from('ball_super')
        //     this.bg.texture = t
        //     this.set_emitter('trail')
        // } else if (bonus === 'mega') {
        //
        //     const t = Texture.from('ball_mega')
        //     this.bg.texture = t
        //     this.set_emitter('dust')
        // } else if (bonus === 'bomb') {
        //
        //     const t = Texture.from('ball_bomb')
        //     this.bg.texture = t
        //     this.set_emitter('star')
        // }
    }

    upgrade(value: number, mode = 'add') {
        if (mode === 'add') this.level += value
        if (mode === 'multiply') this.level *= value
        this.set_value()
    }

    set_value() {
        this.level = Math.floor(this.level)
        const level = this.level

        this.marker.text = pretty_n(level)

        const min = find_x(1)
        const y = find_x(this.level)
        const max = find_x(12000)
        const percent = calc_in_range(min, max, y)
        const g = get_gradient_color(percent, gradient_ball_bg)
        this.color.clear().circle(0, 0, 70).fill({color: g, alpha: 1})
        this.marker.style.fill = get_gradient_color(percent, gradient_ball_marker)

        // if (percent > 0.85) {
        //     this.set_emitter('star')
        // } else if (percent > 0.7) {
        //     this.set_emitter('flare')
        // } else if (percent > 0.45) {
        //     this.set_emitter('dust')
        // } else if (percent > 0.2) {
        //     this.set_emitter('trail')
        // }
    }

    // destroy(options?: DestroyOptions) {
    //     this.emitter.destroy()
    //     window.app.ticker.remove(this.update)
    //     super.destroy(options);
    // }
    //
    // set_emitter(name?: EmitterConfigs) {
    //     if (name === undefined) {
    //         this.emitter.emit = false
    //         window.app.ticker.remove(this.update)
    //         return
    //     }
    //     if (this.emitter_current === name && this.emitter.emit) return
    //     if (!this.emitter.emit) {
    //         window.app.ticker.add(this.update)
    //         this.emitter.emit = true
    //     }
    //     this.emitter_current = name
    //     this.emitter.init(upgradeConfig(emitter_configs[name], [Texture.from('particle')]))
    //     this.emitter.spawnPos.copyFrom(this.position)
    // }
}

class FixerLocker extends BaseNode {
    box = new Container()
    bg = new Container()
    marker = create_text({text: '', style: {fontSize: 30, stroke: {color: colors.sea1, width: 10}}})
    lock = create_sprite('lock')

    bg_bw = new Container()

    bg_mask !: Graphics
    private spin: AnimatedSprite
    private unlocked: boolean = false
    price = 0

    constructor() {
        super()
        for (let i = 0; i < 5; i++) {
            const t = Sprite.from('tile_metal')
            this.bg.addChild(t)
            t.position.x = i * t.width
            this.bg.pivot.x = t.width * 2.5
            this.bg.pivot.y = t.height / 2
        }
        for (let i = 0; i < 5; i++) {
            const t = Sprite.from('tile_metal_bw')
            this.bg_bw.addChild(t)
            t.position.x = i * t.width
            this.bg_bw.pivot.x = t.width * 2.5
            this.bg_bw.pivot.y = t.height / 2
        }
        this.bg_bw.alpha = 0
        this.bh = 80
        this.bw = 140
        this.bg_mask = graphics()
            .roundRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh, 35)
            .fill(0)

        this.addChild(this.box)
        this.box.addChild(this.bg)
        this.box.addChild(this.bg_bw)
        this.box.addChild(this.bg_mask)
        this.box.addChild(this.marker)
        this.box.addChild(this.lock)
        this.bg_bw.mask = this.bg_mask
        this.bg.mask = this.bg_mask
        this.marker.position.y = 10
        this.lock.scale.set(0.2)
        this.lock.position.y = -30

        this.spin = new AnimatedSprite(AssetManager.get('spin'))
        this.spin.texture.source.scaleMode = 'nearest'
        // this.spin.play()
        this.spin.animationSpeed = 0.6
        this.spin.anchor.set(0.5)
        this.spin.scale.set(6)
        this.addChild(this.spin)
        this.spin.visible = false
        this.spin.loop = false
        this.spin.onComplete = () => {
            this.spin.visible = false
            this.spin.gotoAndStop(0)
        }

        this.box.alpha = 0.8

        coins.on('change', ({prev, value}) => {
            if (value >= this.price && !this.unlocked) {
                this.anim_unlock()
            }
            if (value < this.price && this.unlocked) {
                this.anim_lock()
            }
        })

        this.on('pointerup', () => {
            this.trigger('buy_fixer', this.price)
        })
        this.lock.texture = Texture.from('lock_bw')
        this.bg_bw.alpha = 1
    }

    setPrice(value: number) {
        this.price = value
        this.marker.text = `$${value}`

        if (coins.amount >= this.price && !this.unlocked) {
            this.unlocked = true
            this.interactive = true
            this.cursor = 'pointer'
            this.lock.texture = Texture.from('lock')
            this.bg_bw.alpha = 0
        }
    }

    anim_unlock() {
        this.spin.visible = true
        this.spin.play()
        this.set_timeout(100, () => {
            this.lock.texture = Texture.from('lock')
            this.bg_bw.alpha = 0
        })
        this.unlocked = true
        this.interactive = true
        this.cursor = 'pointer'
    }

    anim_lock() {
        this.spin.visible = true
        this.spin.play()
        this.set_timeout(100, () => {
            this.lock.texture = Texture.from('lock_bw')
            this.bg_bw.alpha = 1
        })
        this.unlocked = false
        this.interactive = false
        this.cursor = 'auto'
    }
}

class Fixer extends BaseNode {
    bg = create_sprite('fixer')
    spot = graphics().circle(0, 0, 40).fill('white')
    locker = new FixerLocker()
    id: number
    emitter: Emitter
    update: () => void
    private anim: any
    anim_times = 0
    owned = false
    locked = false

    constructor(id: number) {
        super()
        this.addChild(this.bg)
        this.addChild(this.spot)
        this.addChild(this.locker)
        this.bg.alpha = 0.5
        this.spot.alpha = 0
        this.id = id

        this.interactive = true

        this.emitter = new Emitter(particles_container, upgradeConfig(emitter_configs.fixer, [Texture.from('particle')]))

        this.emitter.emit = false

        this.update = (() => {
            this.emitter.spawnPos.copyFrom(this.position)
            this.emitter.update(0.01)
        })

        window.app.ticker.add(this.update)

        // this.on('pointerdown', () => {
        //     this.trigger('place_bumper', this)
        // })

        this.anim = new Loop(this, 1200, () => {
            this.tween(this.bg)
                .to({rotation: this.bg.rotation + (Math.PI * 3 / 2)}, 500)
                .easing(Easing.Back.InOut)
                .start()
            this.anim_times += 1
        })

        this.locker.visible = false

        fixers.push(this)

        if (!fixers_bought.includes(this.id)) {
            this.locker.setPrice(fixer_prices[this.id])
            this.locker.visible = true
            this.owned = true
            this.locked = true
            this.bg.visible = false
        }

        this.on('buy_fixer', (price: number) => {
            coins.sub(price)
            this.bg.visible = true
            this.tween(this.locker)
                .to({alpha: 0}, 300)
                .start()
            this.set_timeout(310, () => {
                this.locker.visible = false
                this.owned = false
                this.locked = false
            })
            const fx = create_fx('buy_fixer', this.parent?.toGlobal(this))
            fx.animationSpeed = 0.4
            fx.scale.set(2)
            fixers_bought.push(this.id)
        })

        this.bg.scale.set(0.5)
        this.locker.scale.set(0.5)
    }

    anim_start() {
        // rotation + particle animation
        if (this.locked) return
        this.anim.startIfNot(true)
        this.emitter.emit = true
        this.tween(this.bg)
            .to({alpha: 1}, 300)
            .easing(Easing.Quartic.Out)
            .start()
    }

    anim_end() {
        // rotation + particle animation
        this.anim.stop()
        this.emitter.emit = false
        const need = Math.ceil(this.bg.rotation / Math.PI) - (this.bg.rotation / Math.PI)
        this.tween(this.bg)
            .to({alpha: 0.5}, 300)
            .easing(Easing.Quartic.Out)
            .start()

        this.tween(this.bg)
            .to({rotation: this.bg.rotation + (Math.PI * need)}, 500)
            .easing(Easing.Back.InOut)
            .start()
            .delay(1100)
    }


    destroy(options?: DestroyOptions) {
        super.destroy(options);
        window.app.ticker.remove(this.update)
    }

    resize() {
    }
}

class Bumper extends NodePhysics {
    bg = Sprite.from('')
    selected = new Container()
    shape = Bodies.circle(0, 0, 33, {restitution: 10.93, isStatic: true, label: 'bumper'})
    marker = create_text({
        text: '',
        style: {fontSize: 50, fontFamily: 'bubblebody', stroke: {color: colors.add1, width: 3}},
    })
    level = 1
    id = -1
    type = 'add'
    anim_float
    fixer_id = -1
    cell_id = {ix: -1, iy: -1}
    mouse_field = graphics()
    isAnim = false

    constructor(level: number, mode: string) {
        super()
        this.level = level

        this.scale.set(0.8)

        this.bg.anchor.set(0.5)
        this.bg.scale.set(70 / 230)

        const p1 = create_sprite('particle')
        p1.scale.set(90 / p1.width)
        this.selected.addChild(p1)

        this.addChild(this.selected)
        this.addChild(this.bg)
        this.addChild(this.marker)
        this.addChild(this.mouse_field)
        this.selected.alpha = 0
        this.mouse_field.alpha = 0

        PhysicsEngine.add(this, this.shape)

        make_draggable(this)
        this.interactive = true
        this.shape.isSensor = true

        bumpers.push(this)

        const rotate_around = (percent: number, radius: number) => {
            const angle = percent * 2 * Math.PI
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            return {x, y}
        }

        this.anim_float = this.tween({value: 0})
            .to({value: 1}, 10000)
            .onUpdate(obj => {
                const {value} = obj
                this.marker.position.copyFrom(rotate_around(value, 10))
            })
            .yoyo(true)
            .repeat(Infinity)

        let prev_parent: any
        const prev_position = new_point()
        this.on('dragstart', (event) => {
            event.stopPropagation()
            prev_parent = this.parent
            prev_position.copyFrom(this)
            room.addChild(this)
            const point = this.parent.toLocal(event.global)
            this.set_position(point)
            this.shape.isSensor = true
            fixers_enable()
            this.tween(this.selected)
                .to({alpha: 1}, 50)
                .start()
            this.mouse_field.circle(0, 0, 500).fill('white')
            this.scale.set(1.1)
        })
        this.on('dragmove', (event) => {
            event.stopPropagation()
            const point = this.parent.toLocal(event.global)
            this.set_position(point)
        })
        this.on('dragend', (event) => {
            this.mouse_field.clear()

            this.tween(this.selected)
                .to({alpha: 0}, 60)
                .start()

            const end = () => {
                for (const fixer of pole.fixers.children) {
                    if (fixer.id === this.fixer_id) fixer.owned = false
                }
                for (const mc of merge_cells) {
                    if (mc.ix === this.cell_id.ix && mc.iy === this.cell_id.iy) mc.isFree = true
                }
            }

            event.stopPropagation()
            fixers_disable()

            const global = this.parent?.toGlobal(this)

            for (const fixer of pole.fixers.children) {
                if (fixer.owned) continue
                const pos = fixer.parent?.toGlobal(fixer.position)
                const has_intersection = detect_circle_intersection(global, 40, pos, 20)
                if (has_intersection) {
                    this.scale.set(1)
                    end()
                    pole.bumpers.addChild(this)
                    this.set_position(fixer)
                    this.shape.isSensor = false
                    fixer.owned = true
                    this.fixer_id = fixer.id
                    return
                }
            }

            for (const bumper of bumpers) {
                if (bumper === this) continue
                const pos = bumper.parent?.toGlobal(bumper.position)
                const has_intersection = detect_circle_intersection(global, 15, pos, 15)
                if (bumper.level === 13) continue
                if (has_intersection) {
                    if (bumper.level === this.level && bumper.type === this.type) {
                        end()
                        bumper.upgrade()
                        this.destroy()
                    } else {
                        const other_parent = bumper.parent
                        const other_position = new_point().copyFrom(bumper.position)
                        const other_fixer_id = bumper.fixer_id
                        const other_cell_id = bumper.cell_id
                        prev_parent.addChild(bumper)
                        bumper.set_position(prev_position)

                        other_parent?.addChild(this)
                        this.set_position(other_position)

                        bumper.fixer_id = this.fixer_id
                        bumper.cell_id = this.cell_id
                        this.fixer_id = other_fixer_id
                        this.cell_id = other_cell_id
                        pole.bumpers.children.forEach(el => {
                            el.shape.isSensor = false
                        })
                        merge_panel.bumpers.children.forEach(el => {
                            el.shape.isSensor = true
                        })

                        this.scale.set(bumper.scale.x)
                        if (prev_parent.slug && prev_parent.slug.includes('BumpersOnMergeField')) {
                            bumper.shape.isSensor = true
                            bumper.scale.set(0.8)
                        } else {
                            bumper.shape.isSensor = false
                            bumper.scale.set(1)
                        }
                    }
                    return
                }
            }

            for (const mc of merge_cells) {
                if (!mc.isFree) continue
                const pos = mc.parent?.toGlobal(mc.position)
                pos.x += mc.bw / 4
                pos.y += mc.bh / 4
                const has_intersection = detect_circle_intersection(global, 10, pos, 30)
                if (has_intersection) {
                    end()
                    merge_panel.set_to(mc.ix, mc.iy, this)
                    this.shape.isSensor = true
                    this.scale.set(0.8)
                    return
                }
            }


            if (prev_parent) {
                prev_parent.addChild(this)
                this.set_position(prev_position)
                this.shape.isSensor = false
                this.scale.set(1)
                if (prev_parent.slug && prev_parent.slug.includes('BumpersOnMergeField')) {
                    this.shape.isSensor = true
                    this.scale.set(0.8)
                }
            }

        })

        if (mode === 'multiply') this.switch_type()

        this.draw()
    }

    switch_type() {
        if (this.type === 'multiply') {
            this.type = 'add'
            this.draw()
            return
        }

        if (this.type === 'add') {
            this.type = 'multiply'
            this.draw()
            return
        }
    }

    get value() {
        return bumper_values[this.type][this.level]
    }

    draw() {
        const texture = Texture.from('bumper_' + this.type + Math.min(this.level, 11))
        this.bg.texture = texture

        this.marker.text = this.type === 'add' ? '+' : 'x'
        this.marker.text += bumper_values[this.type][this.level]
        if (this.level >= 6) {
            const color_lvl = Math.min(this.level, 11)
            this.marker.style.stroke = {color: (colors as any)['bumper' + color_lvl], width: 10}
        } else {
            this.marker.style.stroke = {color: this.type === 'add' ? colors.add1 : colors.multiply1, width: 10}
        }

        if (this.level === 13) {
            this.anim_float.stop()
            const loop = new Loop(this, 400, () => {
                const pos = randomPointInCircle({x: 0, y: 0}, 10)
                this.tween(this.marker)
                    .to(pos, 300)
                    .easing(Easing.Quartic.InOut)
                    .start()
            })
            loop.start()
        } else if (this.level === 12) {
            this.anim_float.stop()
            this.anim_float.easing(Easing.Linear.InOut)
            this.anim_float.to({value: 100}, 50000)
            this.anim_float.start()
        } else if (this.level > 8) {
            this.anim_float.stop()
            this.anim_float.to({value: 1}, 5000)
            this.anim_float.start()
        }
        if (this.level > 3 && ![13].includes(this.level)) {
            this.anim_float.start()
        }

    }

    upgrade() {
        if (!bumper_values[this.type][this.level + 1]) return
        AudioManager.playSound('sounds/merge', 0.5, random_float(0.9, 1.1))

        this.level += 1
        this.draw()
        const fx = create_fx('merge', this.parent?.toGlobal(this))
        fx.scale.set(random_float(4, 4.5))
        fx.alpha = 0.6
    }

    destroy(options?: DestroyOptions) {
        bumpers = bumpers.filter(el => el.slug !== this.slug)
        super.destroy(options);
    }

    anim_bounce() {
        if (this.isAnim) return
        this.isAnim = true
        const prev = 70 / 230
        this.tween(this.bg)
            .to({scale: {x: prev - 0.05, y: prev - 0.05}}, 10)
            .easing(Easing.Quartic.Out)
            .start()
        this.set_timeout(12, () => {
            this.tween(this.bg)
                .to({scale: {x: prev, y: prev}}, 10)
                .easing(Easing.Quartic.In)
                .start()
        })

        this.set_timeout(70, () => {
            this.isAnim = false
            this.bg.scale.set(prev)
        })
    }
}

class Wall extends NodePhysics {
    bg: Graphics

    constructor(x: number, y: number, width: number, height: number) {
        super()
        this.bg = graphics().rect(x - (width * 0.5), y - (height * 0.5), width, height).fill({
            color: 'blue',
            alpha: 0,
        })
        this.addChild(this.bg)
        this.shape = Bodies.rectangle(x, y, width, height, {isStatic: true})
        PhysicsEngine.add(this, this.shape)
    }
}

class BackgroundPole extends BaseNode {
    bg = new Background()
    mask = graphics().roundRect(0, 0, 100, 100, 12).fill({color: 0xffffff, alpha: 1})
    overlay = graphics().roundRect(0, 0, 100, 100, 12).fill({color: '#806330', alpha: 0.2})
    border?: TilingSprite
    mask_container = new Container()


    constructor() {
        super()
        this.addChild(this.bg)
        this.addChild(this.mask)
        this.addChild(this.overlay)
        // this.bg.filters = [new BlurFilter({strength: 4})]
        this.bg.mask = this.mask
    }

    resize() {
        const {height} = TARGET_SCREEN

        this.bg.bh = height
        this.bg.bw = 0
        this.bg.resize()
        this.bg.position.x = -385

        this.mask.width = this.bw
        this.mask.height = this.bh

        this.overlay.width = this.bw
        this.overlay.height = this.bh

        /// BORDER INNER WHITE SMALL
        if (this.border) this.border.destroy()
        if (this.mask_container) this.mask_container?.destroy()

        this.mask_container = new Container()

        this.border = new TilingSprite({
            texture: Texture.from('tile_bums_white'),
            width: this.bw,
            height: this.bh,
        })

        const stroke = 15
        const border_mask = graphics()
            .roundRect(0, 0, this.bw - stroke * 2, this.bh - stroke * 2, 40)
            .stroke({color: 0xffffff, alignment: 0, width: stroke, join: 'round', alpha: 0.5})
        border_mask.position.x = stroke
        border_mask.position.y = stroke

        this.addChild(this.border)
        this.addChild(this.mask_container)

        this.mask_container.addChild(border_mask)

        this.border.mask = this.mask_container


    }
}

class ForegroundPole extends BaseNode {
    border2?: TilingSprite
    mask_container = new Container()

    resize() {
        /// BORDER OUTER COLOR BIG
        if (this.border2) this.border2.destroy()
        if (this.border2) this.border2?.destroy()
        this.mask_container = new Container()

        this.border2 = new TilingSprite({
            texture: Texture.from('tile_bums'),
            width: this.bw,
            height: this.bh,
        })

        const stroke2 = 10
        const border2_mask = graphics()
            .roundRect(0, 0, this.bw - stroke2 * 2, this.bh - stroke2 * 2, 40)
            .stroke({color: 0xffffff, alignment: 0, width: stroke2, join: 'round', alpha: 0.5})
        border2_mask.position.x = stroke2
        border2_mask.position.y = stroke2

        this.addChild(this.border2)
        this.addChild(this.mask_container)
        this.mask_container.addChild(border2_mask)
        this.border2.mask = this.mask_container


        const score_w = this.bw / 2
        const score = graphics()
            .roundRect(-score_w / 2, -30, score_w, 45, 40)
            .fill(0)
        score.position.x = this.bw / 2
        score.position.y = 30

        this.mask_container.addChild(score)
    }
}

class Pole extends BaseNode {
    bg = new BackgroundPole()
    fg = new ForegroundPole()
    balls_mask = graphics().roundRect(0, 0, 100, 100, 12).fill({color: 0xffffff, alpha: 1})
    balls = new Container<Ball>()
    fixers = new Container<Fixer>()
    bumpers = new Container<Bumper>()
    walls = new Container<Wall>()
    loop: Loop

    constructor() {
        super()
        fixers.length = 0
        this.addChild(this.bg)
        this.addChild(particles_container)
        this.addChild(this.fixers)
        this.addChild(this.balls)
        this.addChild(this.bumpers)
        this.addChild(this.balls_mask)
        this.addChild(this.walls)
        this.addChild(this.fg)

        for (let i = 0; i < 6; i++) {
            this.fixers.addChild(new Fixer(i))
        }

        this.balls.mask = this.balls_mask
        particles_container.mask = this.balls_mask

        this.loop = new Loop(this, 1400, () => {
            if (settings.isPaused.amount) return
            const ball = new Ball()
            const margin = 30
            const m = random_float(3, margin) * random_choice([1, -1])
            ball.set_position({
                x: this.bw * 0.5 + m,
                y: -80,
            })
            this.balls.addChild(ball)
        })

        this.loop.start(true)
        setTimeout(() => {
            const ball = new Ball()
            const margin = 80
            ball.set_position({
                x: this.bw * 0.5 + random_int(-margin, margin),
                y: 80,
            })
            this.balls.addChild(ball)
        }, 2)

        this.interactive = true

        PhysicsEngine.on('collisionstart', (event) => {
            event.pairs.forEach(({bodyA, bodyB}: any) => {
                // Check if a ball has collided with a bumper
                const ball = [bodyA, bodyB].find(body => body.label !== 'bumper')
                const bumper = [bodyA, bodyB].find(body => body.label === 'bumper')

                const maxSpeed = 13

                if (ball && bumper) {
                    if (bumper.isSensor) return
                    const velocityIncrease = 1.7
                    const currentVelocity = ball.velocity

                    let boostedVelocity = Vector.mult(currentVelocity, velocityIncrease)

                    const node_ball = PhysicsEngine.get_node(ball)
                    const node_bumper = PhysicsEngine.get_node(bumper)
                    node_ball.upgrade(node_bumper.value, node_bumper.type)
                    node_bumper.anim_bounce()

                    const speed = Math.sqrt(boostedVelocity.x ** 2 + boostedVelocity.y ** 2);
                    if (speed > maxSpeed) {
                        const scale = maxSpeed / speed;
                        boostedVelocity = Vector.mult(boostedVelocity, scale);
                    }
                    Body.setVelocity(ball, boostedVelocity)
                    AudioManager.playSound('sounds/hit_bumper', 0.2, random_float(0.9, 1.1))
                } else {
                    AudioManager.playSound('sounds/hit_wall', 0.5, random_float(1, 1.1))
                }

            })
        })

    }

    update() {
        for (const ball of this.balls.children) {
            if (ball.position.y >= this.bh + 100 && !ball.counted) {
                this.trigger('add_coins', ball.level)
                if (last_20.length > 20) last_20 = last_20.slice(1)
                ball.counted = true
                this.fx_score(ball.level, ball.parent?.toGlobal(ball))
                last_20.push(ball.level)
                AudioManager.playSound('sounds/cash', 0.6, random_float(0.9, 1.1))
            }
            if (ball.position.y >= this.bh + 1000) {
                ball.destroy()
            }
        }

    }

    fx_score(amount: number, pos: IPoint) {
        const last_avg = (last_20.reduce((a, b) => a + b, 0)) / last_20.length

        const percent = amount - last_avg > 50 ? amount / last_avg : 0.1

        const t = create_text({
            text: `$${pretty_n(amount)}`, style: {
                fontSize: 20, fill: '#ffffff', fontFamily: 'bubblebody',
                // stroke: {width: 10, color: '#d11658'},
            },
        })

        const scale = percent > 0.4 ? Math.min(mapRange(percent, 0.4, 10, 1, 3), 3) : 1
        t.scale.set(scale)
        t.position.copyFrom(particles_container.toLocal(pos))
        if (t.position.x < 30) {
            t.position.x = 30
        } else if (t.position.x > this.bw - 30) {
            t.position.x = this.bw - 30
        }
        t.y = this.bh + t.height
        t.anchor.y = 1
        this.tween(t)
            .to({y: this.bh - 25}, 250)
            .start()

        if (scale > 2.8) {
            t.style.stroke = {width: 10, color: '#d11658'}
        } else if (scale > 2) {
            t.style.stroke = {width: 10, color: '#5b33b6'}
        } else if (scale > 1.2) {
            t.style.stroke = {width: 10, color: '#48df4a'}
        }

        if (scale > 2.8) {
            const fx = create_fx('spawn', {x: 0, y: 0})
            fx.position.copyFrom(t)
            fx.y = this.bh - 100
            fx.scale.set(12)
            fx.gotoAndStop(0)
            fx.visible = false
            fx.animationSpeed = 0.6
            fx.rotation = random_float(0, 100)

            this.set_timeout(240, () => {
                fx.visible = true
                fx.gotoAndPlay(0)
            })

            t.rotation = -Math.PI / 14
            particles_container.addChild(fx)
            particles_container.addChild(t)
            this.set_timeout(550, () => {
                this.tween(t)
                    .to({alpha: 0}, 50)
                    .start()
                    .onComplete(() => {
                        t.destroy()
                    })
            })
        } else {

            particles_container.addChild(t)
            this.set_timeout(550, () => {
                this.tween(t)
                    .to({alpha: 0}, 50)
                    .start()
                    .onComplete(() => {
                        t.destroy()
                    })
            })
        }

    }

    resize() {
        super.resize()
        this.bg.bw = this.bw
        this.bg.bh = this.bh
        this.bg.resize()

        this.fg.bw = this.bw
        this.fg.bh = this.bh
        this.fg.resize()

        this.balls_mask.width = this.bw
        this.balls_mask.height = this.bh

        // walls
        this.walls.children.forEach(el => el.destroy())

        const wall_r = new Wall(0, 0, 300, this.bh * 2)
        const wall_l = new Wall(0, 0, 300, this.bh * 2)

        wall_r.set_position({x: -160, y: this.bh * 0.5})
        wall_l.set_position({x: this.bw + 160, y: this.bh * 0.5})

        const wall_t1 = new Wall(0, 0, this.bw / 1.8, 580)
        wall_t1.set_position({x: 0, y: -280})
        const wall_t2 = new Wall(0, 0, this.bw / 1.8, 580)
        wall_t2.set_position({x: this.bw, y: -280})

        this.walls.addChild(wall_r, wall_l, wall_t1, wall_t2)

        // places
        const fixer_positions = [
            [0.5, 0.4],
            [0.25, 0.5], [0.75, 0.5],
            [0.23, 0.8], [0.77, 0.8],
            [0.5, 0.7],
        ]

        for (let i = 0; i < this.fixers.children.length; i++) {
            const fixer = this.fixers.getChildAt(i)
            const coords = fixer_positions[i]
            fixer.position.x = this.bw * coords[0]
            fixer.position.y = this.bh * coords[1]
        }
    }
}

class Button extends BaseNode {
    bg = new Container()
    bg_disabled = new Container()
    bg_h_initial = 1
    bg_mask !: Graphics
    bg_mask_disabled !: Graphics
    shadow!: Graphics
    marker: Text
    locked: boolean = false
    with_shadow = true

    constructor(text: string) {
        super()

        for (let i = 0; i < 5; i++) {
            const t = Sprite.from('tile_metal')
            this.bg.addChild(t)
            t.position.x = i * t.width
            this.bg.pivot.x = t.width * 2.5
            this.bg.pivot.y = t.height / 2
            this.bg_h_initial = t.height
        }

        for (let i = 0; i < 5; i++) {
            const t = Sprite.from('tile_metal_bw')
            this.bg_disabled.addChild(t)
            t.position.x = i * t.width
            this.bg_disabled.pivot.x = t.width * 2.5
            this.bg_disabled.pivot.y = t.height / 2
        }

        this.marker = create_text({text, style: {fontSize: 130, stroke: {color: colors.sea1, width: 30}}})
        this.marker.anchor.y = 0.65
        this.addChild(this.bg)
        this.addChild(this.bg_disabled)
        this.addChild(this.marker)

        this.interactive = true
        this.cursor = 'pointer'

        this.on('pointerdown', () => {
            if (this.locked) return
            // this.scale.set(0.8)
            if (this.with_shadow) this.shadow.alpha = 0
            // this.resize()
            this.tween(this)
                .to({scale: {x: 0.8, y: 0.8}}, 100)
                .easing(Easing.Quartic.Out)
                .start()
        })

        this.on('pointerup', () => {
            // this.scale.set(1)
            if (this.with_shadow) this.shadow.alpha = 1
            // this.resize()
            this.tween(this)
                .to({scale: {x: 1, y: 1}}, 100)
                .easing(Easing.Quartic.Out)
                .start()
        })
        this.on('pointerupoutside', () => {
            this.scale.set(1)
            if (this.with_shadow) this.shadow.alpha = 1
        })


        this.bg_disabled.alpha = 0
    }

    anim_locked() {
        this.locked = true
        this.tween(this.bg_disabled)
            .to({alpha: 1}, 50)
            .start()
    }

    anim_unlocked() {
        this.locked = false
        this.tween(this.bg_disabled)
            .to({alpha: 0}, 50)
            .start()
    }

    resize() {
        // this.bg.width = this.bw
        // this.bg.height = this.bh
        this.bg.scale.set(
            this.bh / this.bg_h_initial,
        )
        this.bg_disabled.scale.set(
            this.bh / this.bg_h_initial,
        )

        if (this.bg_mask) this.bg_mask.destroy()
        if (this.bg_mask_disabled) this.bg_mask_disabled.destroy()

        this.bg_mask = graphics()
            .roundRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh, 35)
            .fill(0)
        this.bg_mask_disabled = graphics()
            .roundRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh, 35)
            .fill(0)

        this.bg.mask = this.bg_mask
        this.bg_disabled.mask = this.bg_mask_disabled
        this.addChild(this.bg_mask)
        this.addChild(this.bg_mask_disabled)

        const marker_height = this.marker.height / this.marker.scale.y

        this.marker.scale.set((this.bh * 0.8) / marker_height)

        if (this.marker.width > this.bw) {
            this.marker.scale.set(this.marker.scale.x*((this.bw - 20) / this.marker.width))
        }

        if (this.with_shadow) {
            if (this.shadow) this.shadow.destroy()
            this.shadow = graphics()
                .roundRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh, 35)
                .fill({color: 0, alpha: 0.2})

            // this.shadow.filters = [new BlurFilter({strength: 4})]
            this.shadow.position.set(3, 3)

            this.addChildAt(this.shadow, 0)
        }

    }
}

class MergeCell extends BaseNode {
    bg = create_sprite('merge_cell')
    isFree = true
    initial_size
    ix = -1
    iy = -1

    constructor() {
        super()
        this.addChild(this.bg)
        this.bg.anchor.set(0)
        this.initial_size = this.bg.width
        merge_cells.push(this)
    }

    resize() {
        super.resize()

        this.bg.scale.set((this.bw * 0.9) / this.initial_size)
    }
}

class BumpersOnMergeField extends BaseNode {
    constructor() {
        super()
        this.slug = 'BumpersOnMergeField'
    }
}

class MergePanel extends BaseNode {
    cells = new Container<MergeCell>()
    map: Map<number, any> = new Map()
    map_cells: Map<number, any> = new Map()
    bumpers = new BumpersOnMergeField()

    constructor() {
        super()
        this.addChild(this.cells)
        this.addChild(this.bumpers)
        merge_panel = this
    }

    set(ix: number, iy: number, child: any) {
        const num = ix * 100 + iy
        this.map.set(num, child)

        this._get(ix, iy).addChild(child)
    }

    get(ix: number, iy: number) {
        const num = ix * 100 + iy
        return this.map.get(num)!
    }

    delete(ix: number, iy: number) {
        this._get(ix, iy).removeChildAt(1)

        const num = ix * 100 + iy
        this.map.delete(num)
    }


    _set(ix: number, iy: number, child: any) {
        const num = ix * 100 + iy
        this.map_cells.set(num, child)
    }

    _get(ix: number, iy: number) {
        const num = ix * 100 + iy
        return this.map_cells.get(num)!
    }

    hasFree() {
        for (let ix = 0; ix < 5; ix++) {
            for (let iy = 0; iy < 2; iy++) {
                const cell = this._get(ix, iy)
                if (cell.isFree) {
                    return true
                }
            }
        }
        return false
    }

    set_to(ix: number, iy: number, child: any) {
        const cell = this._get(ix, iy)
        this.bumpers.addChild(child)
        child.set_position({x: cell.bw * 0.5 - 3 + cell.x, y: cell.bh * 0.5 - 3 + cell.y})
        cell.isFree = false
        child.cell_id = {ix, iy}
    }

    set_random_free(child: any) {
        for (let ix = 0; ix < 5; ix++) {
            for (let iy = 0; iy < 2; iy++) {
                const cell = this._get(ix, iy)
                if (cell.isFree) {
                    this.bumpers.addChild(child)
                    child.set_position({x: cell.bw * 0.5 - 3 + cell.x, y: cell.bh * 0.5 - 3 + cell.y})
                    cell.isFree = false
                    child.cell_id = {ix, iy}
                    return
                }
            }
        }
    }

    resize() {
        super.resize()
        merge_cells.length = 0
        const free = this.cells.children.map(el => el.isFree)
        if (this.cells) this.cells.destroy()

        this.cells = new Container()
        this.addChildAt(this.cells, 0)

        const cell_size = this.bw / 5
        for (let ix = 0; ix < 5; ix++) {
            for (let iy = 0; iy < 2; iy++) {
                const cell = new MergeCell()
                cell.bw = cell_size
                cell.bh = cell_size
                cell.resize()
                this.cells.addChild(cell)
                cell.position.x = ix * cell_size
                cell.position.y = iy * cell_size
                this._set(ix, iy, cell)
                cell.ix = ix
                cell.iy = iy
            }
        }

        for (let i = 0; i < free.length; i++) {
            this.cells.getChildAt(i).isFree = free[i]
        }
    }
}


class BackgroundPanel extends BaseNode {
    bg = new TilingSprite({
        texture: Texture.from('tile_swirl'),
        width: 1000,
        height: 1000,
    })
    bg_mask!: Graphics

    constructor() {
        super()

        this.addChild(this.bg)
    }

    resize() {
        if (this.bg_mask) this.bg_mask.destroy()

        this.bg_mask = graphics()
            .roundRect(0, 0, this.bw, this.bh, 40)
            .fill('#33eeee')
        this.bg.mask = this.bg_mask
        this.addChild(this.bg_mask)
    }
}


class UpdateBumper {
    level = 0

    get price() {
        if (this.level === 0) return 1
        if (this.level === 1) return 3
        if (this.level === 2) return 6
        const x = this.level - 1
        const v =
            0.00136 * Math.pow(x, 3) +
            0.22315 * Math.pow(x, 2) +
            8.40176 * x -
            8.42673
        return Math.ceil(v)
    }
}

const update_bumper = new UpdateBumper()

class UpdateCash {
    level = 0

    get price() {
        if (this.level === 0) return 1
        if (this.level === 1) return 3
        if (this.level === 2) return 6
        const x = this.level - 1
        const v =
            0.00136 * Math.pow(x, 3) +
            0.22315 * Math.pow(x, 2) +
            8.22176 * x -
            8.42673
        return Math.ceil(v)
    }

    value(level = 0) {
        level += this.level

        if (level === 0) return 1

        return 2 * (level)
    }
}

const update_cash = new UpdateCash()
const update_next = {
    price: 1000000,
}


class UpdateSpeed {
    level = 0

    upgrade() {
        if (this.isMax) return
        this.level += 1
    }

    get isMax() {
        return this.value() === this.value(1)
    }

    get price() {
        const x = this.level + 2
        const v =
            1.89888 * Math.pow(x, 4) +
            1.80136 * Math.pow(x, 3) +
            2.22315 * Math.pow(x, 2) +
            8.40176 * x -
            8.42673
        return Math.ceil(v)
    }

    value(level = 0) {
        level += this.level
        let value = 1400

        for (let i = 0; i < level; i++) {
            if (i < 5) value -= 100
            else if (i < 10) value -= 50
            else if (i < 13) value -= 25
            else if (i < 25) value -= 5
        }

        return value
    }

    value_pretty(level = 0) {
        const value = this.value(level)
        return value / 1000 + ' s'
    }
}


const update_speed = new UpdateSpeed()

// for (let i =0;i<100;i++){
//     console.log(i, update_speed.price,update_speed.value())
//     update_speed.upgrade()
// }

class Panel extends BaseNode {
    bg = new BackgroundPanel()
    merge_panel = new MergePanel()

    button_bumper = new Button('+' + i18n.bumper)
    marker_price_bumper = create_text({
        text: `$${update_bumper.price}`,
        style: {fontSize: 80, stroke: {color: colors.sea2, width: 20}},
    })
    marker_price_speed = create_text({
        text: `$${update_speed.price}`,
        style: {fontSize: 120, stroke: {color: colors.sea2, width: 20}},
    })
    marker_price_cash = create_text({
        text: `$${update_cash.price}`,
        style: {fontSize: 120, stroke: {color: colors.sea2, width: 20}},
    })

    marker_stats_speed = create_text({
        text: `${update_speed.value_pretty()} > ${update_speed.value_pretty(1)}`,
        style: {fontSize: 120, stroke: {color: colors.sea2, width: 20}},
    })
    marker_stats_cash = create_text({
        text: `${update_cash.value()} > ${update_cash.value(1)}`,
        style: {fontSize: 120, stroke: {color: colors.sea2, width: 20}},
    })

    button_speed = new Button('+' + i18n.speed)
    button_cash = new Button('+' + i18n.cash)
    button_next = new Button(i18n.next + ' >')
    marker_price_next = create_text({
        text: `$1.000.000`,
        style: {fontSize: 120, stroke: {color: colors.sea2, width: 20}},
    })

    constructor() {
        super()

        this.addChild(this.bg)
        this.addChild(this.merge_panel)
        this.addChild(this.button_bumper)
        this.addChild(this.button_speed)
        this.addChild(this.button_cash)
        this.addChild(this.button_next)
        this.addChild(this.marker_price_next)
        this.addChild(this.marker_price_bumper)
        this.addChild(this.marker_price_speed)
        this.addChild(this.marker_price_cash)

        this.addChild(this.marker_stats_speed)
        this.addChild(this.marker_stats_cash)

        this.button_bumper.on('pointerdown', () => {
            if (coins.amount < update_bumper.price) return
            if (!this.merge_panel.hasFree()) return
            AudioManager.playSound('sounds/buy')
            coins.sub(update_bumper.price)

            update_bumper.level += 1
            this.setButtonsText()

            const mode = [4, 19, 44, 67, 92, 144, 145, 178].includes(update_bumper.level) ? 'multiply' : 'add'
            const bumpers_of_this_mode = stats_bumpers
                .filter(el => !el.destroyed)
                .filter(el => el.type === mode)
            const levels = bumpers_of_this_mode.map(el => el.level)
            levels.sort((a, b) => b - a)
            const max_level = levels[0] || 1
            const probs = bumper_probabilities[max_level] || [1000]

            const die = random_int(0, 1000)
            let p_sum = 0
            let lvl = 0
            for (let i = 0; i <= probs.length; i++) {
                const p = probs[i]
                p_sum += p
                if (p_sum >= die) {
                    lvl = i
                    break
                }
            }

            const level = lvl + 1
            const bumper = new Bumper(level, mode)
            this.merge_panel.set_random_free(bumper)

            stats_bumpers.push(bumper)

            const fx = create_fx('merge', bumper.parent?.toGlobal(bumper))
            fx.scale.set(random_float(4, 4.5))
            fx.alpha = 0.6
        })

        window.spawn_bumper = (level: any, mode: any) => {

            const bumper = new Bumper(level, mode)
            this.merge_panel.set_random_free(bumper)

            stats_bumpers.push(bumper)

            const fx = create_fx('merge', bumper.parent?.toGlobal(bumper))
            fx.scale.set(random_float(7, 8))
        }

        this.button_speed.on('pointerdown', () => {
            if (coins.amount < update_speed.price) return
            AudioManager.playSound('sounds/buy')
            coins.sub(update_speed.price)

            update_speed.upgrade()
            this.trigger('increase_speed')
            this.setButtonsText()

            if (update_speed.isMax) {
                this.button_speed.anim_locked()
                this.button_speed.interactive = false
            }
        })

        this.button_cash.on('pointerdown', () => {
            if (coins.amount < update_cash.price) return
            AudioManager.playSound('sounds/buy')
            coins.sub(update_cash.price)

            update_cash.level += 1
            this.setButtonsText()
        })

        this.button_next.on('pointerdown', () => {
            if (coins.amount < update_next.price) return
            coins.set(10000200)
            for (const bumper of bumpers) {
                bumper.destroy()
            }
            fixers_bought.length = 0
            fixers_bought.push(5, 2)
            for (const fixer of fixers) {
                fixer.owned = false
                if (!fixers_bought.includes(fixer.id)) {
                    fixer.locker.setPrice(fixer_prices[fixer.id])
                    fixer.locker.visible = true
                    fixer.owned = true
                    fixer.locked = true
                    fixer.bg.visible = false
                    fixer.locker.alpha = 1
                }
            }

            for (const el of pole.balls.children) {
                el.destroy()
            }

            for (const item of merge_cells) {
                item.isFree = true
            }
            bumpers.length = 0
            pole.bumpers.children.length = 0
            merge_panel.bumpers.children.length = 0
            update_bumper.level = 0
            update_speed.level = 0
            update_cash.level = 0

            room.resize()
            this.setButtonsText()
            map_level.add(1)
            if (map_level.amount > 4) map_level.set(1)
            const texture = Texture.from('bg' + map_level.amount)
            room.bg.bg.texture = texture
            pole.bg.bg.bg.texture = texture
        })

        coins.on('change', ({prev, value}) => {
            if (value < update_bumper.price && !this.button_bumper.locked) {
                this.button_bumper.anim_locked()
            } else if (value >= update_bumper.price && this.button_bumper.locked) {

                this.button_bumper.anim_unlocked()
            }

            if (value < update_cash.price && !this.button_cash.locked) {
                this.button_cash.anim_locked()
            } else if (value >= update_cash.price && this.button_cash.locked) {

                this.button_cash.anim_unlocked()
            }

            if (value < update_speed.price && !this.button_speed.locked) {
                this.button_speed.anim_locked()
            } else if (value >= update_speed.price && this.button_speed.locked) {
                if (!update_speed.isMax) this.button_speed.anim_unlocked()
            }


            if (value < update_next.price && !this.button_next.locked) {
                this.button_next.anim_locked()
            } else if (value >= update_next.price && this.button_next.locked) {
                this.button_next.anim_unlocked()
            }
        })
    }

    setButtonsText() {
        this.marker_price_speed.text = `$${pretty_n(update_speed.price)}`
        this.marker_stats_speed.text = `${update_speed.value_pretty()} > ${update_speed.value_pretty(1)}`

        this.marker_price_cash.text = `$${pretty_n(update_cash.price)}`
        this.marker_stats_cash.text = `${update_cash.value()} > ${update_cash.value(1)}`

        this.marker_price_bumper.text = `$${pretty_n(update_bumper.price)}`
    }

    resize() {
        super.resize()

        this.bg.bw = this.bw
        this.bg.bh = this.bh
        this.bg.resize()

        w_const(this.merge_panel, this.bw * 0.9)
        h_const(this.merge_panel, this.merge_panel.bw * (2 / 5))
        this.merge_panel.position.x = (this.bw - this.merge_panel.bw) * 0.5 // center on X
        this.merge_panel.position.y = 5
        this.merge_panel.resize()

        this.button_bumper.bh = 45
        this.button_bumper.bw = 180
        this.button_bumper.resize()
        this.button_bumper.position.x = this.bw * 0.5
        this.button_bumper.position.y = this.merge_panel.bh + this.merge_panel.y + 25

        this.button_speed.bh = 30
        this.button_speed.bw = 120
        this.button_speed.resize()
        this.button_speed.position.x = this.bw * 0.8
        this.button_speed.position.y = this.button_bumper.position.y + 50

        this.button_cash.bh = 30
        this.button_cash.bw = 120
        this.button_cash.resize()
        this.button_cash.position.x = this.bw * 0.2
        this.button_cash.position.y = this.button_bumper.position.y + 50

        const marker_pb_height = this.marker_price_bumper.height / this.marker_price_bumper.scale.y
        this.marker_price_bumper.scale.set(40 / marker_pb_height)
        this.marker_price_bumper.x = this.bw * 0.5
        this.marker_price_bumper.y = this.button_bumper.y + 40

        const marker_ps_height = this.marker_price_speed.height / this.marker_price_speed.scale.y
        this.marker_price_speed.scale.set(30 / marker_ps_height)
        this.marker_price_speed.x = this.button_speed.x
        this.marker_price_speed.y = this.button_speed.y + 30

        const marker_pc_height = this.marker_price_cash.height / this.marker_price_cash.scale.y
        this.marker_price_cash.scale.set(30 / marker_pc_height)
        this.marker_price_cash.x = this.button_cash.x
        this.marker_price_cash.y = this.button_cash.y + 30


        const marker_ss_height = this.marker_stats_speed.height / this.marker_stats_speed.scale.y
        this.marker_stats_speed.scale.set(20 / marker_ss_height)
        this.marker_stats_speed.x = this.marker_price_speed.x
        this.marker_stats_speed.y = this.marker_price_speed.y + 25
        this.marker_stats_speed.alpha = 0.7

        const marker_sc_height = this.marker_stats_cash.height / this.marker_stats_cash.scale.y
        this.marker_stats_cash.scale.set(20 / marker_sc_height)
        this.marker_stats_cash.x = this.marker_price_cash.x
        this.marker_stats_cash.y = this.marker_price_cash.y + 25
        this.marker_stats_cash.alpha = 0.7


        this.button_next.bh = 25
        this.button_next.bw = 100
        this.button_next.resize()
        this.button_next.position.x = this.bw * 0.5
        this.button_next.position.y = this.marker_price_bumper.y + 55

        const marker_pn_height = this.marker_price_next.height / this.marker_price_next.scale.y
        this.marker_price_next.scale.set(20 / marker_pn_height)
        this.marker_price_next.x = this.button_next.x
        this.marker_price_next.y = this.button_next.y + 20
        this.marker_price_next.alpha = 0.7


    }
}

class Background extends BaseNode {
    bg = create_sprite('bg' + map_level.amount)
    proportions_initial

    constructor() {
        super()
        this.addChild(this.bg)
        this.proportions_initial = this.bg.width / this.bg.height
        this.bg.anchor.set(0)
    }

    resize() {
        if (this.bw) {
            this.bh = this.bw / this.proportions_initial
        }

        if (this.bh) {
            this.bw = this.bh * this.proportions_initial
        }

        if (!this.bw && !this.bh) throw Error('!this.bw && !this.bh')

        this.bg.width = this.bw
        this.bg.height = this.bh
    }

}

class ContainerAspectRatio extends BaseNode {
    marker_score = create_text({
        text: `$${coins.amount}`,
        style: {fontSize: 25, stroke: {color: colors.sea3, width: 10}},
    })
    pole = new Pole()
    panel = new Panel()

    constructor() {
        super()
        pole = this.pole
        this.addChild(this.pole)
        this.addChild(this.marker_score)
        this.addChild(this.panel)

        coins.on('change', () => {
            this.marker_score.text = coins.amount
        })

        this.on('add_coins', (amount) => {
            coins.add(amount)
        })

        this.on('increase_speed', () => {
            if (this.pole.loop.time < 200) return

            this.pole.loop.time -= 100
        })

        this.set_timeout(50, () => {
            coins.set(0)
        })
    }

    resize() {
        const {width, height} = TARGET_SCREEN
        const s_width = window.screen_size.width
        const s_height = window.screen_size.height

        const target_aspect_ratio = (9 / 20)

        this.bh = height
        this.bw = Math.min(width, height * target_aspect_ratio)

        if (s_width / s_height < target_aspect_ratio) {
            this.scale.set(s_width / this.bw)
        } else {
            this.scale.set(s_height / this.bh)
        }

        this.position.x = -this.bw / 2 * this.scale.x
        this.position.y = -this.bh / 2 * this.scale.y

        w_const(this.pole, this.bw * 0.95)
        // h_const(this.pole, this.bh * 0.70)
        this.pole.position.x = (this.bw - this.pole.bw) * 0.5 // center on X
        this.pole.position.y = 5

        w_const(this.panel, this.bw * 0.95)
        h_const(this.panel, this.panel.bw / 1.3)

        h_const(this.pole, this.bh - this.panel.bh - 20)
        this.pole.resize()

        this.panel.position.x = (this.bw - this.pole.bw) * 0.5 // center on X
        this.panel.position.y = this.pole.position.y + this.pole.bh + 10 // bottom from pole
        this.panel.resize()

        this.marker_score.position.x = this.bw * 0.5
        this.marker_score.position.y = 25
    }
}


export default class S_Room extends BaseNode {
    bg = new Background()
    aspect_ratio = new ContainerAspectRatio()
    _unload!: OmitThisParameter<any>

    constructor() {
        super()
        AudioManager.playMusic('sounds/music', 0.1)
        room = this
        this.addChild(this.bg)
        this.addChild(this.aspect_ratio)
        PhysicsEngine.recreate()
    }

    start() {
        this._unload = this.update.bind(this)
        window.app.ticker.add(this._unload)
    }

    update(ticker: Ticker) {
        if (settings.isPaused.amount) return
        PhysicsEngine.update()
        this.aspect_ratio.pole.update()
    }

    destroy(options?: DestroyOptions) {
        window.app.ticker.remove(this._unload)
        super.destroy(options)
    }

    resize() {
        super.resize()
        this.bw = window.screen_size.width
        this.bh = window.screen_size.height

        if (this.bh > this.bw) {
            this.bg.bh = this.bh
            this.bg.bw = 0
            this.bg.resize()
        } else {
            this.bg.bh = 0
            this.bg.bw = this.bw
            this.bg.resize()
        }

        this.bg.position.x = -this.bw / 2
        this.bg.position.y = -this.bh / 2

        this.aspect_ratio.resize()
    }
}

/*

Button { // container with rounded corners
    bg_idle // tiled-row background
    bg_disabled // tiled-row background
    marker // label scaled to fit parent rect
}

Bumper {
    bg // image
    marker // label
}

Fixer {
    particles // group
    bg // image
}

Ball {
    bg // image
    marker // label
}

room {
    bg // full-height or full-width depending on resolution
    ar { // main container with all game sized to be always of aspect ratio
       vrow { // place child items in verticaly row, items take full width
            pole { // take all the height available & overflow hidden
                bg {
                    bg // image take full screen
                    bg_tiles // tiled bg take full parent
                    mask // graphics
                }
                walls // group
                fixers // group
                balls // group
                bumpers // group
                fg {
                    bg_tiles // tiled bg take full parent
                    mask // graphics
                }
                marker_score // label with no restriction positioned absolutely
            }
            panel { // take fixed amount of height; have rounded corners
                bg // tiled background taking all width and height
                merge_panel { // 5x2 grid
                    cell // image
                }

                button-& // Button; constant w&h; constant position
                    bumper, speed, cash
                marker_price-& // label; constant w; auto h; constant position
                    bumper, speed, cash, next
                marker_stats-& // label; constant w; auto h; constant position
                    speed, cash
            }
       }
    }
}



 */
