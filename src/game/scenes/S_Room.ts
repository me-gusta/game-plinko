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
    TilingSprite, Texture, Sprite,
} from 'pixi.js'
import {create_sprite, create_text, graphics} from '$lib/create_things'
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

const twp: any = new Pane()

let coins = 1000000000
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


let bumper_selected: Bumper | undefined = undefined

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

let last_20: any[] = []


const particles_container = new Container()

type EmitterConfigs = 'star' | 'dust' | 'trail' | 'flare'

class Ball extends NodePhysics {
    color = graphics().circle(0, 0, 70).fill({color: '#ec9f9f', alpha: 1})
    bg = create_sprite('ball')
    level = 2 ** (update_cash.level - 1)
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
    ball = false

    update

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

        this.emitter = new Emitter(particles_container, upgradeConfig(emitter_configs.trail, [Texture.from('particle')]))
        this.emitter.emit = false
        this.update = (() => {
            if (particles_container.children.length > 1000) return
            this.emitter.spawnPos.copyFrom(this.position)
            this.emitter.update(0.01)
        })

        PhysicsEngine.add(this, this.shape)
        this.set_value()
    }

    upgrade(value: number, mode = 'add') {
        if (mode === 'add') this.level += value
        if (mode === 'multiply') this.level *= value
        this.set_value()
    }

    set_value() {
        this.level = Math.floor(this.level)

        if (this.level < 1000) this.marker.text = this.level
        else this.marker.text = `${(this.level / 1000).toFixed(1)}k`

        const min = find_x(1)
        const y = find_x(this.level)
        const max = find_x(12000)
        const percent = calc_in_range(min, max, y)
        console.log(percent)
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


class BumperPlace extends BaseNode {
    bg = create_sprite('fixer')
    spot = graphics().circle(0, 0, 40).fill('white')
    id: number
    emitter: Emitter
    update: () => void

    constructor(id: number) {
        super()
        this.addChild(this.bg)
        this.addChild(this.spot)
        this.spot.alpha = 0
        this.id = id

        this.interactive = true

        this.emitter = new Emitter(particles_container, upgradeConfig(emitter_configs.fixer, [Texture.from('particle')]))

        this.emitter.emit = false

        this.update = (() => {
            if (particles_container.children.length > 1000) return
            this.emitter.spawnPos.copyFrom(this.position)
            this.emitter.update(0.01)
        })

        window.app.ticker.add(this.update)

        this.on('pointerdown', () => {
            this.trigger('place_bumper', this)
        })

        registerKeypress('e', () =>{
            this.emitter.emit = true
            this.tween(this.bg)
                .to({rotation: this.bg.rotation + (Math.PI * 3/2)}, 500)
                .easing(Easing.Back.InOut)
                .start()
                .onComplete(() => {
                    this.emitter.emit = false
                })
        })
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
    selected = graphics().circle(0, 0, 50).stroke({color: 'green', alignment: 0, width: 5})
    shape = Bodies.circle(0, 0, 60, {restitution: 10.93, isStatic: true, label: 'bumper'})
    marker = create_text({
        text: '',
        style: {fontSize: 70, fontFamily: 'bubblebody', stroke: {color: colors.add1, width: 10}},
    })
    level = 1
    id = -1
    type = 'add'
    anim

    constructor(level: number, mode: string) {
        super()
        this.level = level

        this.bg.anchor.set(0.5)
        this.bg.scale.set(0.5)

        this.addChild(this.bg)
        this.addChild(this.selected)
        this.addChild(this.marker)
        this.selected.alpha = 0

        PhysicsEngine.add(this, this.shape)

        // make_draggable(this)
        this.interactive = true

        this.on('pointerdown', () => {
            if (!bumper_selected) {
                bumper_selected = this
                this.selected.alpha = 1
                return
            }

            if (bumper_selected === this) {
                // bumper_selected = undefined
                this.switch_type()
                return
            }
            if (bumper_selected.level !== this.level) {
                bumper_selected.selected.alpha = 0
                bumper_selected = this
                this.selected.alpha = 1
                return
            }

            this.upgrade()
            this.selected.alpha = 0
            bumper_selected.destroy()
            bumper_selected = undefined
        })

        const rotate_around = (percent: number, radius: number) => {
            const angle = percent * 2 * Math.PI
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            return {x, y}
        }

        this.anim = this.tween({value: 0})
            .to({value: 1}, 10000)
            .onUpdate(obj => {
                const {value} = obj
                this.marker.position.copyFrom(rotate_around(value, 10))
            })
            .yoyo(true)
            .repeat(Infinity)
            .start()

        // this.on('dragstart', (event) => {
        //     event.stopPropagation()
        // })
        // this.on('dragmove', (event) => {
        //     event.stopPropagation()
        //     const point = this.parent.toLocal(event.global)
        //     this.set_position(point)
        // })
        // this.on('dragend', (event) => {
        //     event.stopPropagation()
        // })

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
        const texture = Texture.from('bumper_' + this.type + this.level)
        this.bg.texture = texture

        this.marker.text = this.type === 'add' ? '+' : 'x'
        this.marker.text += bumper_values[this.type][this.level]
        if (this.level >= 6) {
            const color_lvl = Math.min(this.level, 11)
            this.marker.style.stroke = {color: (colors as any)['bumper' + color_lvl], width: 10}
        } else {
            this.marker.style.stroke = {color: this.type === 'add' ? colors.add1 : colors.multiply1, width: 10}
        }
    }

    upgrade() {

        this.level += 1
        this.draw()
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

        const stroke = 30
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

        const stroke2 = 20
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
            .roundRect(-score_w / 2, -30, score_w, 90, 40)
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
    bumpers_places = new Container<BumperPlace>()
    bumpers = new Container<Bumper>()
    walls = new Container<Wall>()
    loop: Loop

    constructor() {
        super()

        this.addChild(this.bg)
        this.addChild(particles_container)
        this.addChild(this.bumpers_places)
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

        this.loop.start()


        this.interactive = true

        this.on('place_bumper', (place: BumperPlace) => {
            const point = new Point().copyFrom(place)
            // point.x -= 30
            // point.y -= 30
            // spawn_bumper(point)
            if (!bumper_selected) return

            // if(this.bumpers.children.includes(bumper_selected)) return
            bumper_selected.id = place.id
            bumper_selected.set_position(point)
            this.bumpers.addChild(bumper_selected)
            bumper_selected.selected.alpha = 0
            bumper_selected = undefined

        })

        PhysicsEngine.on('collisionstart', (event) => {
            event.pairs.forEach(({bodyA, bodyB}: any) => {
                // Check if a ball has collided with a bumper
                const ball = [bodyA, bodyB].find(body => body.label !== 'bumper')
                const bumper = [bodyA, bodyB].find(body => body.label === 'bumper')

                const maxSpeed = 25

                if (ball && bumper) {
                    const velocityIncrease = 2
                    const currentVelocity = ball.velocity

                    let boostedVelocity = Vector.mult(currentVelocity, velocityIncrease)

                    const node_ball = PhysicsEngine.get_node(ball)
                    const node_bumper = PhysicsEngine.get_node(bumper)
                    node_ball.upgrade(node_bumper.value, node_bumper.type)
                    // node_bumper.upgrade()

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
            }
            if (ball.position.y >= this.bh + 1000) {
                ball.destroy()
                last_20.push(ball.level)
            }
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

        this.walls.addChild(wall_r, wall_l)

        // places

        this.bumpers_places.children.forEach(el => el.destroy())

        const place1 = new BumperPlace(1)
        place1.position.x = this.bw * 0.5
        place1.position.y = this.bh * 0.3
        this.bumpers_places.addChild(place1)


        const place2 = new BumperPlace(2)
        place2.position.x = this.bw * 0.25
        place2.position.y = this.bh * 0.5
        this.bumpers_places.addChild(place2)


        const place3 = new BumperPlace(3)
        place3.position.x = this.bw * 0.75
        place3.position.y = this.bh * 0.5
        this.bumpers_places.addChild(place3)


        const place4 = new BumperPlace(4)
        place4.position.x = this.bw * 0.15
        place4.position.y = this.bh * 0.8
        this.bumpers_places.addChild(place4)


        const place5 = new BumperPlace(5)
        place5.position.x = this.bw * 0.85
        place5.position.y = this.bh * 0.8
        this.bumpers_places.addChild(place5)

        const place6 = new BumperPlace(6)
        place6.position.x = this.bw * 0.5
        place6.position.y = this.bh * 0.65
        this.bumpers_places.addChild(place6)
    }
}

class Button extends BaseNode {
    bg = new Container()
    bg_h_initial = 1
    bg_mask !: Graphics
    shadow !: Graphics
    marker: Text

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
    initial_size

    constructor() {
        super()
        this.addChild(this.bg)
        this.bg.anchor.set(0)
        this.initial_size = this.bg.width
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

    constructor() {
        super()
        this.addChild(this.cells)
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

    set_random_free(child: any) {
        for (let ix = 0; ix < 5; ix++) {
            for (let iy = 0; iy < 2; iy++) {
                const cell = this._get(ix, iy)
                if (cell.children.length < 2) {
                    cell.addChild(child)
                    child.set_position({x: cell.bw * 0.5 - 8, y: cell.bh * 0.5 - 8})
                    return
                }
            }
        }
    }

    resize() {
        super.resize()

        if (this.cells) this.cells.destroy()

        this.cells = new Container()
        this.addChild(this.cells)

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
            }
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
        text: `$${update_cash.price}`,
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
            if (coins < update_bumper.price) return
            coins -= update_bumper.price

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

            if (bumper_selected) bumper_selected.selected.alpha = 0
            bumper_selected = bumper
            bumper_selected.selected.alpha = 1
        })

        this.button_speed.on('pointerdown', () => {
            if (coins < update_speed.price) return
            coins -= update_speed.price

            update_speed.level += 1
            update_speed.price += ((x) => 212 * Math.exp(0.676 * x))(update_speed.level)
            update_speed.price = Math.floor(update_speed.price)
            this.trigger('increase_speed')
            this.marker_price_speed.text = `${update_speed.price}`
        })

        this.button_cash.on('pointerdown', () => {
            if (coins < update_cash.price) return
            coins -= update_cash.price

            update_cash.level += 1
            update_cash.price += ((x) => 235 * Math.exp(0.431 * x))(update_cash.level)
            update_cash.price = Math.floor(update_cash.price)
            this.marker_price_cash.text = `${update_cash.price}`
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


export default class S_Room extends BaseNode {
    bg = new Background()
    marker_score = create_text({text: '$12356', style: {fontSize: 50, stroke: {color: colors.sea3, width: 20}}})
    pole = new Pole()
    panel = new Panel()
    _unload!: OmitThisParameter<any>

    constructor() {
        super()
        this.addChild(this.bg)
        this.addChild(this.pole)
        this.addChild(this.marker_score)
        this.addChild(this.panel)
        PhysicsEngine.recreate()

        this.on('add_coins', (amount) => {
            coins += amount
            this.marker_score.text = coins
        })

        this.on('increase_speed', () => {
            if (this.pole.loop.time < 200) return

            this.pole.loop.time -= 100
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
        const {width, height} = window.screen_size

        this.position.set(-width * 0.5, -height * 0.5)
        this.bw = width
        this.bh = height

        this.bg.bh = this.bh
        this.bg.bw = 0
        this.bg.resize()
        this.bg.position.x = -385


        w_const(this.pole, this.bw * 0.9)
        h_const(this.pole, this.bh * 0.6)
        this.pole.position.x = (this.bw - this.pole.bw) * 0.5 // center on X
        this.pole.position.y = 10
        this.pole.resize()


        w_const(this.panel, this.bw * 0.9)
        h_const(this.panel, this.bh * 0.37)
        this.panel.position.x = (this.bw - this.pole.bw) * 0.5 // center on X
        this.panel.position.y = this.pole.position.y + this.pole.bh + 20 // bottom from pole
        this.panel.resize()

        this.marker_score.position.x = this.bw * 0.5
        this.marker_score.position.y = 50
    }
}
