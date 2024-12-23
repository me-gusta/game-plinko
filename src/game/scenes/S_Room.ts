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
import {random_float, random_int} from '$lib/random'
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
import {detect_circle_intersection, mapRange, shorten_num} from '$src/game/utility'
import {IPoint} from '$lib/Vector'
import microManage from '$lib/dev/microManage'

class Value extends EventEmitter {
    amount: number

    constructor(amount: number) {
        super()
        this.amount = amount
    }

    set(amount: number) {
        const prev = this.amount
        this.amount = amount
        this.amount = Math.floor(this.amount)
        this.emit('change', {
            prev,
            value: this.amount,
        })
    }

    mul(amount: number) {
        const prev = this.amount
        this.amount *= amount
        this.amount = Math.floor(this.amount)
        this.emit('change', {
            prev,
            value: this.amount,
        })
    }

    add(amount: number) {
        const prev = this.amount
        this.amount += amount
        this.amount = Math.floor(this.amount)
        this.emit('change', {
            prev,
            value: this.amount,
        })
    }

    sub(amount: number) {
        this.add(-amount)
    }
}

const coins = new Value(0)
const update_speed = {
    price: 30,
    level: 1,
}

const update_cash = {
    price: 30,
    level: 1,
}

const update_bumper = {
    price: 1,
    level: 1,
}

const stats_bumpers: Bumper[] = []

const bumper_prices = [1, 1, 4, 17, 26, 39, 47, 60, 73, 86, 99, 111, 129, 141, 159, 176, 189, 206, 227, 244, 261, 283, 304, 321, 347, 369, 390, 416, 441, 463, 493, 519, 544, 574, 604, 634, 669, 699, 733, 767, 801, 836, 874, 913, 951, 994, 1033, 1076, 1119, 1166, 1209, 1256, 1307, 1354, 1406, 1457, 1509, 1564, 1620, 1676, 1736, 1791, 1851, 1916, 1980, 2044, 2109, 2177, 2246, 2314, 2387, 2460, 2537, 2614, 2691, 2769, 2850, 2931, 3017, 3103, 3189, 3279, 3369, 3463, 3557, 3651, 3750, 3849, 3947, 4050, 4157, 4264, 4371, 4479, 4590, 4706, 4821, 4937, 5057, 5177, 5301, 5426]

const MAX_GRADIENT_POINTS = 41000

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
const fixers_bought: number[] = [6, 3]
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
    2: 100,
    4: 2500,
    5: 15000,
    1: 80000,
}

const create_fx = (name: string, pos_global: IPoint) => {
    const pos = room.toLocal(pos_global)
    const textures = AssetManager.get(name)
    const sprite = new AnimatedSprite(textures)
    sprite.texture.baseTexture.scaleMode = 'nearest'
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
    level = Math.max(2 ** (update_cash.level - 1), 1)
    marker: Text
    container = new Container()
    emitter: Emitter
    emitter_current: EmitterConfigs = 'trail'
    shape = Bodies.circle(0, 0, 30, {
        restitution: 0.9,
        friction: 0.33,
        collisionFilter: {
            group: -1,
        },
        label: 'ball',
        slop: 0.01,
    })
    counted = false
    flicker = create_sprite('particle')

    update

    constructor(bonus?: string) {
        super()

        this.marker = create_text({text: this.level, style: {fontSize: 80, fill: '#317a0b', fontFamily: 'bubblebody'}})
        this.marker.anchor.y = 0.55

        this.addChild(this.container)
        this.container.addChild(this.bg)
        this.container.addChild(this.color)
        this.container.addChild(this.marker)
        this.container.scale.set(0.5)
        this.color.blendMode = 'multiply'

        this.emitter = new Emitter(particles_container, upgradeConfig(emitter_configs.trail, [Texture.from('particle')]))
        this.emitter.emit = false
        this.update = (() => {
            this.emitter.spawnPos.copyFrom(this.position)
            this.emitter.update(0.01)
        })

        PhysicsEngine.add(this, this.shape)
        this.set_value()

        if (bonus) {

            this.marker.alpha = 0
            this.counted = true
            this.addChild(this.flicker)
            this.flicker.scale.set(2)
            this.tween(this.flicker)
                .to({alpha: 0}, 155)
                .easing(Easing.Sinusoidal.InOut)
                .repeat(Infinity)
                .yoyo(true)
                .start()
            this.bg.scale.set(2.5)

            this.cursor = 'pointer'
        }

        if (bonus === 'super') {
            const t = Texture.from('ball_super')
            this.bg.texture = t
            this.set_emitter('trail')
        } else if (bonus === 'mega') {

            const t = Texture.from('ball_mega')
            this.bg.texture = t
            this.set_emitter('dust')
        } else if (bonus === 'bomb') {

            const t = Texture.from('ball_bomb')
            this.bg.texture = t
            this.set_emitter('star')
        }
    }

    upgrade(value: number, mode = 'add') {
        if (mode === 'add') this.level += value
        if (mode === 'multiply') this.level *= value
        this.set_value()
    }

    set_value() {
        this.level = Math.floor(this.level)
        const level = this.level

        this.marker.text = shorten_num(level)

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

    destroy(options?: DestroyOptions) {
        this.emitter.destroy()
        window.app.ticker.remove(this.update)
        super.destroy(options);
    }

    set_emitter(name?: EmitterConfigs) {
        if (name === undefined) {
            this.emitter.emit = false
            window.app.ticker.remove(this.update)
            return
        }
        if (this.emitter_current === name && this.emitter.emit) return
        if (!this.emitter.emit) {
            window.app.ticker.add(this.update)
            this.emitter.emit = true
        }
        this.emitter_current = name
        this.emitter.init(upgradeConfig(emitter_configs[name], [Texture.from('particle')]))
        this.emitter.spawnPos.copyFrom(this.position)
    }
}

class FixerLocker extends BaseNode {
    box = new Container()
    bg = new Container()
    marker = create_text({text: '$1000', style: {fontSize: 30, stroke: {color: colors.sea1, width: 10}}})
    lock = create_sprite('lock')

    bg_mask !: Graphics
    private spin: AnimatedSprite
    private blackWhite: ColorMatrixFilter
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
        this.bh = 80
        this.bw = 140
        this.bg_mask = graphics()
            .roundRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh, 35)
            .fill(0)

        this.addChild(this.box)
        this.box.addChild(this.bg)
        this.box.addChild(this.bg_mask)
        this.box.addChild(this.marker)
        this.box.addChild(this.lock)
        this.bg.mask = this.bg_mask
        this.marker.position.y = 10
        this.lock.scale.set(0.2)
        this.lock.position.y = -30

        this.blackWhite = new ColorMatrixFilter()
        this.blackWhite.blackAndWhite(false)
        this.box.filters = [this.blackWhite]

        this.spin = new AnimatedSprite(AssetManager.get('spin'))
        // this.spin.play()
        this.spin.animationSpeed = 0.6
        this.spin.anchor.set(0.5)
        this.spin.scale.set(4)
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

        if (coins.amount >= this.price && !this.unlocked) {
            this.unlocked = true
            this.interactive = true
            this.cursor = 'pointer'
            this.box.filters = []
        }

        this.on('pointerup', () => {
            this.trigger('buy_fixer', this.price)
        })
    }

    setPrice(value: number) {
        this.price = value
        this.marker.text = `$${value}`
    }

    anim_unlock() {
        this.spin.visible = true
        this.spin.play()
        this.set_timeout(100, () => {
            this.box.filters = []
        })
        this.unlocked = true
        this.interactive = true
        this.cursor = 'pointer'
    }

    anim_lock() {
        this.spin.visible = true
        this.spin.play()
        this.set_timeout(100, () => {
            this.box.filters = [this.blackWhite]
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
            fx.scale.set(6)
            fixers_bought.push(this.id)
        })
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
    shape = Bodies.circle(0, 0, 60, {restitution: 10.93, isStatic: true, label: 'bumper'})
    marker = create_text({
        text: '',
        style: {fontSize: 70, fontFamily: 'bubblebody', stroke: {color: colors.add1, width: 10}},
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

        this.bg.anchor.set(0.5)
        this.bg.scale.set(0.5)

        const p1 = create_sprite('particle')
        p1.scale.set(3.4)
        const p2 = create_sprite('particle_dark')
        p2.scale.set(3.5)
        // this.selected.addChild(p2)
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
        this.on('sdragstart', (event) => {
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
        })
        this.on('sdragmove', (event) => {
            event.stopPropagation()
            const point = this.parent.toLocal(event.global)
            this.set_position(point)
        })
        this.on('sdragend', (event) => {
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
                const has_intersection = detect_circle_intersection(global, 80, pos, 40)
                if (has_intersection) {
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
                const has_intersection = detect_circle_intersection(global, 30, pos, 30)
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
                    }
                    return
                }
            }

            for (const mc of merge_cells) {
                if (!mc.isFree) continue
                const pos = mc.parent?.toGlobal(mc.position)
                pos.x += mc.bw / 4
                pos.y += mc.bh / 4
                const has_intersection = detect_circle_intersection(global, 10, pos, 40)
                if (has_intersection) {
                    end()
                    merge_panel.set_to(mc.ix, mc.iy, this)
                    this.shape.isSensor = true
                    return
                }
            }


            if (prev_parent) {
                prev_parent.addChild(this)
                this.set_position(prev_position)
                this.shape.isSensor = false
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

        if (this.level > 8) {
            this.anim_float.stop()
            this.anim_float.to({value: 1}, 5000)
            this.anim_float.start()
        }
        if (this.level > 3) {
            this.anim_float.start()
        }

    }

    upgrade() {

        if (!bumper_values[this.type][this.level + 1]) return

        this.level += 1
        this.draw()
        const fx = create_fx('merge', this.parent?.toGlobal(this))
        fx.scale.set(7, 8)
        fx.alpha = 0.6
    }

    destroy(options?: DestroyOptions) {
        console.log('b4', bumpers.length)
        bumpers = bumpers.filter(el => el.slug !== this.slug)
        super.destroy(options);
    }

    anim_bounce() {
        if (this.isAnim) return
        this.isAnim = true
        const prev = this.bg.scale.x
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

        this.set_timeout(50, () => {
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
    mask = graphics().roundRect(0, 0, 100, 100, 6).fill({color: 0xffffff, alpha: 1})
    overlay = graphics().roundRect(0, 0, 100, 100, 6).fill({color: '#806330', alpha: 0.2})
    border?: TilingSprite
    mask_container = new Container()


    constructor() {
        super()
        this.addChild(this.bg)
        this.addChild(this.mask)
        this.addChild(this.overlay)
        this.bg.filters = [new BlurFilter({strength: 4})]
        this.bg.mask = this.mask
    }

    resize() {
        const {height} = window.screen_size

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
    balls_mask = graphics().roundRect(0, 0, 100, 100, 7).fill({color: 0xffffff, alpha: 1})
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

        this.balls.mask = this.balls_mask
        particles_container.mask = this.balls_mask

        this.loop = new Loop(this, 1400, () => {
            const ball = new Ball()
            const margin = 80
            ball.set_position({
                x: this.bw * 0.5 + random_int(-margin, margin),
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

                const maxSpeed = 25

                if (ball && bumper && !bumper.isSensor) {
                    const velocityIncrease = 2
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
            text: `$${shorten_num(amount)}`, style: {
                fontSize: 40, fill: '#ffffff', fontFamily: 'bubblebody',
                // stroke: {width: 10, color: '#d11658'},
            },
        })

        const scale = percent > 0.4 ? Math.min(mapRange(percent, 0.4, 10, 1, 3), 3) : 1
        t.scale.set(scale)
        t.position.copyFrom(particles_container.toLocal(pos))
        t.y = this.bh + t.height
        t.anchor.y = 1
        this.tween(t)
            .to({y: this.bh - 50}, 250)
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
        fixers.length = 0
        this.fixers.children.forEach(el => el.destroy())
        this.fixers.children.length = 0

        const place1 = new Fixer(1)
        place1.position.x = this.bw * 0.5
        place1.position.y = this.bh * 0.4
        this.fixers.addChild(place1)


        const place2 = new Fixer(2)
        place2.position.x = this.bw * 0.25
        place2.position.y = this.bh * 0.5
        this.fixers.addChild(place2)


        const place3 = new Fixer(3)
        place3.position.x = this.bw * 0.75
        place3.position.y = this.bh * 0.5
        this.fixers.addChild(place3)


        const place4 = new Fixer(4)
        place4.position.x = this.bw * 0.15
        place4.position.y = this.bh * 0.8
        this.fixers.addChild(place4)


        const place5 = new Fixer(5)
        place5.position.x = this.bw * 0.85
        place5.position.y = this.bh * 0.8
        this.fixers.addChild(place5)

        const place6 = new Fixer(6)
        place6.position.x = this.bw * 0.5
        place6.position.y = this.bh * 0.7
        this.fixers.addChild(place6)
    }
}

class Button extends BaseNode {
    bg = new Container()
    bg_h_initial = 1
    bg_mask !: Graphics
    shadow !: Graphics
    marker: Text
    locked: boolean
    private blackWhite: ColorMatrixFilter

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

        this.marker = create_text({text, style: {fontSize: 130, stroke: {color: colors.sea1, width: 30}}})
        this.marker.anchor.y = 0.65
        this.addChild(this.bg)
        this.addChild(this.marker)

        this.interactive = true
        this.cursor = 'pointer'

        this.on('pointerdown', () => {
            if (this.locked) return
            this.scale.set(0.9)
            this.shadow.alpha = 0
        })

        this.on('pointerup', () => {
            this.scale.set(1)
            this.shadow.alpha = 1
        })
        this.on('pointerupoutside', () => {
            this.scale.set(1)
            this.shadow.alpha = 1
        })


        this.blackWhite = new ColorMatrixFilter()
        this.blackWhite.blackAndWhite(false)
    }

    anim_locked() {
        this.locked = true
        this.filters = [this.blackWhite]
    }

    anim_unlocked() {
        this.locked = false
        this.filters = []
    }

    resize() {
        // this.bg.width = this.bw
        // this.bg.height = this.bh
        this.bg.scale.set(
            this.bh / this.bg_h_initial,
        )

        if (this.bg_mask) this.bg_mask.destroy()

        this.bg_mask = graphics()
            .roundRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh, 35)
            .fill(0)

        this.addChild(this.bg_mask)
        this.bg.mask = this.bg_mask

        const marker_height = this.marker.height / this.marker.scale.y

        this.marker.scale.set((this.bh * 0.8) / marker_height)

        if (this.shadow) this.shadow.destroy()
        this.shadow = graphics()
            .roundRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh, 35)
            .fill({color: 0, alpha: 0.2})

        this.shadow.filters = [new BlurFilter({strength: 4})]
        this.shadow.position.set(10, 10)

        this.addChildAt(this.shadow, 0)

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


class MergePanel extends BaseNode {
    cells = new Container<MergeCell>()
    map: Map<number, any> = new Map()
    map_cells: Map<number, any> = new Map()
    bumpers = new Container<Bumper>()

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
        child.set_position({x: cell.bw * 0.5 - 8 + cell.x, y: cell.bh * 0.5 - 8 + cell.y})
        cell.isFree = false
        child.cell_id = {ix, iy}
    }

    set_random_free(child: any) {
        for (let ix = 0; ix < 5; ix++) {
            for (let iy = 0; iy < 2; iy++) {
                const cell = this._get(ix, iy)
                if (cell.isFree) {
                    this.bumpers.addChild(child)
                    child.set_position({x: cell.bw * 0.5 - 8 + cell.x, y: cell.bh * 0.5 - 8 + cell.y})
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

class Panel extends BaseNode {
    bg = new BackgroundPanel()
    merge_panel = new MergePanel()

    button_bumper = new Button('+bumper')
    marker_price_bumper = create_text({
        text: `$${update_bumper.price}`,
        style: {fontSize: 120, stroke: {color: colors.sea2, width: 20}},
    })
    marker_price_speed = create_text({
        text: `$${update_speed.price}`,
        style: {fontSize: 120, stroke: {color: colors.sea2, width: 20}},
    })
    marker_price_cash = create_text({
        text: `$${update_cash.price} (1)`,
        style: {fontSize: 120, stroke: {color: colors.sea2, width: 20}},
    })
    button_speed = new Button('+speed')
    button_cash = new Button('+cash')

    constructor() {
        super()
        this.addChild(this.bg)
        this.addChild(this.merge_panel)
        this.addChild(this.button_bumper)
        this.addChild(this.button_speed)
        this.addChild(this.button_cash)
        this.addChild(this.marker_price_bumper)
        this.addChild(this.marker_price_speed)
        this.addChild(this.marker_price_cash)


        this.button_bumper.on('pointerdown', () => {
            if (coins.amount < update_bumper.price) return
            if (!this.merge_panel.hasFree()) return
            coins.sub(update_bumper.price)

            update_bumper.level += 1
            update_bumper.price = bumper_prices[update_bumper.level]

            update_bumper.price = Math.floor(update_bumper.price)
            this.marker_price_bumper.text = `$${update_bumper.price}`

            const mode = random_float() < 0.05 ? 'multiply' : 'add'
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
            fx.scale.set(random_float(7, 8))
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
            coins.sub(update_speed.price)

            update_speed.level += 1
            update_speed.price += ((x) => 212 * Math.exp(0.676 * x))(update_speed.level)
            update_speed.price = Math.floor(update_speed.price)
            this.trigger('increase_speed')
            this.marker_price_speed.text = `$${update_speed.price} (${update_speed.level-1})`
        })

        this.button_cash.on('pointerdown', () => {
            if (coins.amount < update_cash.price) return
            coins.sub(update_cash.price)

            update_cash.level += 1
            update_cash.price += ((x) => 235 * Math.exp(0.431 * x))(update_cash.level)
            update_cash.price = Math.floor(update_cash.price)
            this.marker_price_cash.text = `${update_cash.price} (${2 * (update_cash.level - 1)})`
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

                this.button_speed.anim_unlocked()
            }
        })
    }

    resize() {
        super.resize()

        this.bg.bw = this.bw
        this.bg.bh = this.bh
        this.bg.resize()

        w_const(this.merge_panel, this.bw * 0.9)
        h_const(this.merge_panel, this.merge_panel.bw * (2 / 5))
        this.merge_panel.position.x = (this.bw - this.merge_panel.bw) * 0.5 // center on X
        this.merge_panel.position.y = 20
        this.merge_panel.resize()

        this.button_bumper.bh = 100
        this.button_bumper.bw = 370
        this.button_bumper.resize()
        this.button_bumper.position.x = this.bw * 0.5
        this.button_bumper.position.y = this.merge_panel.bh + this.merge_panel.y + 50 + 10

        this.button_speed.bh = 80
        this.button_speed.bw = 260
        this.button_speed.resize()
        this.button_speed.position.x = this.bw * 0.8
        this.button_speed.position.y = this.button_bumper.position.y + 120

        this.button_cash.bh = 80
        this.button_cash.bw = 260
        this.button_cash.resize()
        this.button_cash.position.x = this.bw * 0.2
        this.button_cash.position.y = this.button_bumper.position.y + 120

        const marker_pb_height = this.marker_price_bumper.height / this.marker_price_bumper.scale.y
        this.marker_price_bumper.scale.set(60 / marker_pb_height)
        this.marker_price_bumper.x = this.bw * 0.5
        this.marker_price_bumper.y = this.button_bumper.y + 50 + 20

        const marker_ps_height = this.marker_price_speed.height / this.marker_price_speed.scale.y
        this.marker_price_speed.scale.set(60 / marker_ps_height)
        this.marker_price_speed.x = this.button_speed.x
        this.marker_price_speed.y = this.button_speed.y + 40 + 20

        const marker_pc_height = this.marker_price_cash.height / this.marker_price_cash.scale.y
        this.marker_price_cash.scale.set(60 / marker_pc_height)
        this.marker_price_cash.x = this.button_cash.x
        this.marker_price_cash.y = this.button_cash.y + 40 + 20
    }
}

class Background extends BaseNode {
    bg = create_sprite('bg')
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

}


export default class S_Room extends BaseNode {
    bg = new Background()
    marker_score = create_text({text: '$12356', style: {fontSize: 25, stroke: {color: colors.sea3, width: 10}}})
    pole = new Pole()
    panel = new Panel()
    _unload!: OmitThisParameter<any>
    button_pause = new Button('=')

    constructor() {
        super()
        room = this
        pole = this.pole
        this.addChild(this.bg)
        this.addChild(this.pole)
        this.addChild(this.marker_score)
        this.addChild(this.panel)
        this.addChild(this.button_pause)
        PhysicsEngine.recreate()

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
            coins.set(10000000)
        })
    }

    start() {
        this._unload = this.update.bind(this)
        window.app.ticker.add(this._unload)
    }

    update(ticker: Ticker) {
        PhysicsEngine.update()
        this.pole.update()
    }

    destroy(options?: DestroyOptions) {
        window.app.ticker.remove(this._unload)
        super.destroy(options)
    }

    resize() {
        super.resize()
        const {width, height} = {width: 600, height: 900}
        const s_width = window.screen_size.width
        const s_height = window.screen_size.height
        window.room = this

        const target_aspect_ratio = (9/20)

        this.bh = height
        this.bw = Math.min(width, height * target_aspect_ratio)

        if (s_width / s_height < target_aspect_ratio) {
            this.scale.set(s_width / this.bw)
        } else {
            this.scale.set(s_height / this.bh)
        }

        this.position.x = -this.bw/2 * this.scale.x
        this.position.y = -this.bh/2 * this.scale.y

        w_const(this.pole, this.bw * 0.95)
        // h_const(this.pole, this.bh * 0.70)
        this.pole.position.x = (this.bw - this.pole.bw) * 0.5 // center on X
        this.pole.position.y = 5

        w_const(this.panel, this.bw * 0.95)
        h_const(this.panel, this.panel.bw / 1.3)

        h_const(this.pole, this.bh - this.panel.bh -20)
        this.pole.resize()

        this.panel.position.x = (this.bw - this.pole.bw) * 0.5 // center on X
        this.panel.position.y = this.pole.position.y + this.pole.bh + 10 // bottom from pole
        this.panel.resize()

        this.marker_score.position.x = this.bw * 0.5
        this.marker_score.position.y = 25

        this.button_pause.bw=70
        this.button_pause.bh=70
        this.button_pause.resize()
        this.button_pause.position.x = this.bw - 40
        this.button_pause.position.y = 40
        this.button_pause.marker.rotation = Math.PI / 2
    }
}
