import BaseNode from '$lib/BaseNode'
import {create_text, graphics} from '$lib/create_things'
import colors from '$src/game/colors'
import {h_const, w_const} from '$lib/resize'
import {TARGET_SCREEN} from '$lib/utility'
import {Container, Graphics, Sprite, Text, Texture, TilingSprite} from 'pixi.js'
import {Easing} from '@tweenjs/tween.js'
import {settings} from '$src/game/logica/data'
import microManage from '$lib/dev/microManage'

let panel!: Panel

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
                .to({scale:{x:0.8,y:0.8}}, 100)
                .easing(Easing.Quartic.Out)
                .start()
        })

        this.on('pointerup', () => {
            // this.scale.set(1)
            if (this.with_shadow) this.shadow.alpha = 1
            // this.resize()
            this.tween(this)
                .to({scale:{x:1,y:1}}, 100)
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

class Range extends BaseNode {
    value = 100
    txt
    btn_plus
    btn_minus
    marker

    constructor(txt: string) {
        super()
        this.btn_plus = new Button('+')
        this.btn_minus = new Button('-')
        this.marker = create_text({text: txt + ' 100%'})
        this.txt = txt

        this.addChild(this.btn_plus)
        this.addChild(this.btn_minus)
        this.addChild(this.marker)

        this.btn_plus.on('pointerup', () => {
            if (this.value === 100) return
            this.value += 10
            this.marker.text = `${txt} ${this.value}%`
            this.emit('value_set', this.value)
        })

        this.btn_minus.on('pointerup', () => {
            if (this.value === 0) return
            this.value -= 10
            this.marker.text = `${txt} ${this.value}%`
            this.emit('value_set', this.value)
        })
    }

    resize() {
        this.btn_plus.bw = this.bh
        this.btn_plus.bh = this.bh
        this.btn_plus.resize()
        this.btn_plus.position.y = this.bh / 2
        this.btn_plus.position.x = this.bw - this.bh / 2

        this.btn_minus.bw = this.bh
        this.btn_minus.bh = this.bh
        this.btn_minus.resize()
        this.btn_minus.position.y = this.bh / 2
        this.btn_minus.position.x = this.bh / 2

        this.marker.position.x = this.bw / 2
        this.marker.position.y = this.bh / 2
    }
}


class Panel extends BaseNode {
    bg = new BackgroundPanel()
    btn_play = new Button('play')
    btn_settings = new Button('settings')
    range_sound = new Range('sound')
    range_music = new Range('music')
    btn_back = new Button('back')

    constructor() {
        super()
        panel = this
        this.addChild(this.bg)
        this.addChild(this.btn_play)
        this.addChild(this.btn_settings)
        this.addChild(this.range_sound)
        this.addChild(this.range_music)
        this.addChild(this.btn_back)

        this.btn_settings.on('pointerup', () => {
            this.range_sound.visible = true
            this.range_music.visible = true
            this.btn_back.visible = true

            this.btn_play.visible = false
            this.btn_settings.visible = false
        })

        this.btn_back.on('pointerup', () => {
            this.btn_play.visible = true
            this.btn_settings.visible = true

            this.range_sound.visible = false
            this.range_music.visible = false
            this.btn_back.visible = false
        })
        this.range_sound.visible = false
        this.range_music.visible = false
        this.btn_back.visible = false

        this.range_music.on('value_set', value => {
            settings.music_level.set(value)
        })

        this.range_sound.on('value_set', value => {
            settings.sound_level.set(value)
        })
    }

    resize() {
        this.bg.bw = this.bw
        this.bg.bh = this.bh
        this.bg.resize()

        this.btn_play.bw = 280
        this.btn_play.bh = 120
        this.btn_play.resize()
        this.btn_play.position.x = this.bw / 2
        this.btn_play.position.y = 80

        this.btn_settings.bw = 220
        this.btn_settings.bh = 60
        this.btn_settings.resize()
        this.btn_settings.position.x = this.bw / 2
        this.btn_settings.position.y = 210

        this.range_sound.bw = 300
        this.range_sound.bh = 40
        this.range_sound.resize()
        this.range_sound.position.x = (this.bw - this.range_sound.bw) / 2
        this.range_sound.position.y = 30

        this.range_music.bw = 300
        this.range_music.bh = 40
        this.range_music.resize()
        this.range_music.position.x = (this.bw - this.range_sound.bw) / 2
        this.range_music.position.y = 90

        this.btn_back.bw = 120
        this.btn_back.bh = 30
        this.btn_back.resize()
        this.btn_back.position.x = this.bw / 2
        this.btn_back.position.y = 220
    }

    enable_settings() {
        this.range_sound.visible = true
        this.range_music.visible = true
        this.btn_back.visible = true

        this.btn_play.visible = false
        this.btn_settings.visible = false
    }
}


class ContainerAspectRatio extends BaseNode {
    panel = new Panel()

    constructor() {
        super()
        this.addChild(this.panel)
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

        w_const(this.panel, this.bw * 0.8)
        h_const(this.panel, this.panel.bw / 1.3)

        this.panel.position.x = this.bw * 0.1
        this.panel.position.y = (this.bh - this.panel.bh) / 2
        this.panel.resize()
    }
}


export default class S_Pause extends BaseNode {
    overlay = graphics().rect(-50, -50, 100, 100).fill({color: 0, alpha: 0.4})
    ar_container = new ContainerAspectRatio()
    button_pause = new Button('=')

    constructor() {
        super()
        this.addChild(this.overlay)
        this.addChild(this.ar_container)
        this.addChild(this.button_pause)
        this.overlay.interactive = true
        this.button_pause.on('pointerup', () => {
            this.overlay.visible = true
            this.ar_container.visible = true

            this.tween(this.overlay)
                .to({alpha:1}, 100)
                .easing(Easing.Quartic.Out)
                .start()

            this.tween(this.ar_container)
                .to({alpha:1}, 100)
                .easing(Easing.Quartic.Out)
                .start()

            this.tween(this.button_pause)
                .to({alpha:0}, 100)
                .easing(Easing.Quartic.Out)
                .start()
            settings.isPaused.set(1)
        })

        panel.btn_play.on('pointerup', () => {
            this.tween(this.overlay)
                .to({alpha:0}, 100)
                .easing(Easing.Quartic.Out)
                .start()

            this.tween(this.ar_container)
                .to({alpha:0}, 100)
                .easing(Easing.Quartic.Out)
                .start()

            this.tween(this.button_pause)
                .to({alpha:1}, 100)
                .easing(Easing.Quartic.Out)
                .start()

            this.set_timeout(110, () => {
                this.overlay.visible = false
                this.ar_container.visible = false
            })
            settings.isPaused.set(0)
        })
    }

    resize() {
        const {width, height} = window.screen_size
        this.bw = width
        this.bh = height

        this.overlay.width = width
        this.overlay.height = height

        this.ar_container.resize()

        const scale_btn = this.bh / TARGET_SCREEN.height
        const btn_size = 70 * scale_btn
        this.button_pause.bw = btn_size
        this.button_pause.bh = btn_size
        this.button_pause.resize()
        this.button_pause.position.x = this.bw / 2 - (btn_size / 2) - 10
        this.button_pause.position.y = -this.bh / 2 + (btn_size / 2) + 10
        this.button_pause.marker.rotation = Math.PI / 2
    }
}
