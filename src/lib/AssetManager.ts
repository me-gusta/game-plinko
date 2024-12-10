import {Assets, Spritesheet} from 'pixi.js'

class AssetManager {
    map = new Map()

    async load_spritesheet(name: string) {
        await Assets.load({
            alias: name,
            src: `/assets/auto-ss/compiled/${name}.json`,
        })

        const sheet: Spritesheet = Assets.get(name)
        Object.entries(sheet.textures).forEach(([key, value]) => {
            this.set(key, value)
        })
        Object.entries(sheet.animations).forEach(([key, value]) => {
            this.set(key, value)
        })

        // in production this can be changed to Object.assign (will it speed up??)
    }

    set(key: string, value: any) {
        if (this.map.get(key)) throw Error(`asset "${key}" is already created`)
        this.map.set(key, value)
    }

    get(key: string) {
        const value = this.map.get(key)
        if (!value) throw Error(`unknow asset "${key}"`)
        return value
    }
}

export default new AssetManager()
