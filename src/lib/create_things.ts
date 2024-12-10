import {AnimatedSprite, Assets, Graphics, Point, Sprite, Spritesheet, Text, TextOptions, Texture} from "pixi.js";
import colors from '$src/game/colors'
import {IPoint, Vector} from '$lib/Vector'
import AssetManager from '$lib/AssetManager'

export const create_sprite = (name: string) => {
    const x = Sprite.from(name)
    x.anchor.set(0.5, 0.5)
    return x
}


export const create_text = (options: TextOptions) => {
    if (!options.style) options.style = {}
    if (!options.style.fontFamily) {
        options.style.fontFamily = 'arco'
    }
    if (!options.style.fill) {
        options.style.fill = colors.bright
    }
    const x = new Text(options)
    x.anchor.set(0.5, 0.5)
    return x
}

export const create_animated_sprite = (name: string) => {
    const animation = AssetManager.get(name)
    const a = new AnimatedSprite(animation)
    a.anchor.set(0.5, 0.5)
    a.animationSpeed = 0.2
    return a
}

export const new_point = (x?: number, y?: number) => {
    return new Point(x, y)
}

export const vector = (x?: number | IPoint, y?: number) => {
    if (typeof x === 'number' || x === undefined) {
        return new Vector(x, y)
    }
    return Vector.fromPoint(x)
}

export const graphics = () => new Graphics()

// export const texture = () => new Texture()
