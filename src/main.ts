import {Application, Assets} from 'pixi.js'
import load_assets from 'virtual:assets'
import Scene from '$src/game/scenes/Scene'
import {process_timers} from '$lib/time'
import {time_groups} from '$lib/BaseNode'
import AssetManager from '$lib/AssetManager'
import {sleep} from '$src/game/utility'

const preload = async () => {
    await load_assets();

    // Load fonts in parallel
    await Promise.all([
        Assets.load({
            alias: 'arco',
            src: '/assets/fonts/arco.otf',
        }),
        Assets.load({
            alias: 'bubblebody',
            src: '/assets/fonts/bubblebody.ttf',
        })
    ]);

    // Load spritesheets in parallel
    await Promise.all([
        AssetManager.load_spritesheet('buy_fixer'),
        AssetManager.load_spritesheet('jackpot'),
        AssetManager.load_spritesheet('merge'),
        AssetManager.load_spritesheet('spawn'),
        AssetManager.load_spritesheet('spin')
    ]);


}

const init = async () => {



    AssetManager.set('sounds/buy', new Howl({src: '/assets/sounds/buy.mp3'}))
    AssetManager.set('sounds/cash', new Howl({src: '/assets/sounds/cash.mp3'}))
    AssetManager.set('sounds/cash_super', new Howl({src: '/assets/sounds/cash_super.mp3'}))
    AssetManager.set('sounds/hit_bumper', new Howl({src: '/assets/sounds/hit_bumper.mp3'}))
    AssetManager.set('sounds/hit_wall', new Howl({src: '/assets/sounds/hit_wall.mp3'}))
    AssetManager.set('sounds/music', new Howl({src: '/assets/sounds/music.mp3'}))
    AssetManager.set('sounds/merge', new Howl({src: '/assets/sounds/merge.mp3'}))

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

window.startGame = async () => {
    // await preload()
    // await init()
}

const wait_for_api = async () => {
    await preload()
    let i = 0
    while (i < 50) {
        if (window.ysdk)
            return
        await sleep(50)
        i++
    }
}

wait_for_api().then(async () => {
    await init()
})

declare global {
    interface Window {
        screen_size: { width: number; height: number, ratio: number, vertical: boolean }
        startGame: () => Promise<void>
        app: Application
        ysdk: any
    }
}
