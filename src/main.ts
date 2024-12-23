import {Application, Assets, TexturePool, TextureStyle} from 'pixi.js'
import load_assets from 'virtual:assets'
import laod_fonts from 'virtual:load-fonts'
import Scene from '$src/game/scenes/Scene'
import {RATIO_H_MIN, RATIO_V_MAX} from '$lib/resize'
import DataGlobal from '$src/game/logica/DataUser'
import {process_timers} from '$lib/time'
import {time_groups} from '$lib/BaseNode'
import AssetManager from '$lib/AssetManager'

laod_fonts()

const init = async () => {
    // TexturePool.textureOptions.scaleMode = 'nearest'
    // TextureStyle.defaultOptions.scaleMode = 'nearest';

    await load_assets()

    await Assets.load({
        alias: 'arco',
        src: '/assets/fonts/arco.otf',
    })

    await Assets.load({
        alias: 'bubblebody',
        src: '/assets/fonts/bubblebody.ttf',
    })

    await AssetManager.load_spritesheet('buy_fixer')
    await AssetManager.load_spritesheet('jackpot')
    await AssetManager.load_spritesheet('merge')
    await AssetManager.load_spritesheet('spawn')
    await AssetManager.load_spritesheet('spin')

    const app = new Application()
    window.app = app
    await app.init({
        resolution: 2,
        antialias: true
    })

    app.ticker.add(process_timers)

    window.screen_size = {width: 100, height: 100, ratio: 1, vertical: true}

    let scene_main: Scene

    const on_resize = () => {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const canvas_box = document.getElementById('canvas-box')!

        const ratio = windowWidth / windowHeight
        // if (ratio < RATIO_V_MAX || ratio > RATIO_H_MIN) {
        //     canvas_box.style.width = "100%"
        //     canvas_box.style.height = "100%"
        // } else {
        //     const mobileWidth = windowHeight * (9 / 16)
        //     canvas_box.style.width = `${mobileWidth}px`
        //     canvas_box.style.height = `${windowHeight}px`
        // }
        canvas_box.style.width = `${windowWidth}px`
        canvas_box.style.height = `${windowHeight}px`

        const rect = canvas_box.getBoundingClientRect()

        let width = rect.width
        let height = rect.height

        if (width <= 0) width = 1
        if (height <= 0) height = 1

        // const maxAspectRatio = 20 / 9
        // if (width / height > maxAspectRatio) {
        //     width = height * maxAspectRatio
        // } else if (height / width > maxAspectRatio) {
        //     height = width * maxAspectRatio
        // }
        //
        // const screenScale = Math.min(width / 960.0, height / 960.0)

        window.screen_size = {
            width: width,
            height: height,
            ratio: 1,
            vertical: false
        }
        window.screen_size.ratio = window.screen_size.width / window.screen_size.height
        window.screen_size.vertical = window.screen_size.ratio <= 1

        // app.stage.scale.set(screenScale)

        app.stage.position.set(width / 2, height / 2)

        app.canvas.style.width = `${width}px`
        app.canvas.style.height = `${height}px`
        app.renderer.resize(width, height)
        if (!scene_main) {
            scene_main = new Scene()
        }

        scene_main.onResize(1,1)
    }

    document.querySelector<HTMLDivElement>('#canvas-box')!.appendChild(app.canvas)

    on_resize()
    app.stage.addChild(scene_main!)
    window.addEventListener('resize', on_resize)

    scene_main!.start()
    app.ticker.add((time_data: any) => {
        for (const group of time_groups.values()) {
            group.update(time_data.lastTime)
        }
    })
}

window.onGPInit = async (gp) => {
    await init()
    await gp.player.ready
    await gp.ads.showPreloader()
    gp.ads.showSticky()
    DataGlobal.install(gp)
}
init()
declare global {
    interface Window {
        screen_size: { width: number; height: number, ratio: number, vertical: boolean }
        onGPInit: (gp: any) => Promise<void>
        app: Application
    }
}
