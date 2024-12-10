import registerKeypress from '$lib/dev/registerKeypress'

export default (obj: any) => {
    console.log('MICROMANAGE ENABLED')
    let speed = 1
    registerKeypress('w', () => {
        obj.position.y -= speed
    })
    registerKeypress('s', () => {
        obj.position.y += speed
    })
    registerKeypress('a', () => {
        obj.position.x -= speed
    })
    registerKeypress('d', () => {
        obj.position.x += speed
    })
    registerKeypress('c', () => {
        speed -= 5
    })
    registerKeypress('v', () => {
        speed += 5
    })
    registerKeypress('q', () => {
        obj.scale.x += obj.scale.x > 0 ? -0.1 : 0.1
        obj.scale.y += obj.scale.y > 0 ? -0.1 : 0.1
    })
    registerKeypress('e', () => {
        obj.scale.x += obj.scale.x > 0 ? 0.1 : -0.1
        obj.scale.y += obj.scale.y > 0 ? 0.1 : -0.1
    })
    // WASD - move
    // CV - speed+-
    // QE - scale+-
    // X - log
    const fl = (n: number) => Number(n.toFixed(2))
    registerKeypress('x', () => {
        const text =
            `${JSON.stringify({ x: obj.position.x, y: obj.position.y })}\n`
            + `.position.set(${obj.position.x}, ${obj.position.y})\n`
            + `.scale.set(${fl(obj.scale.x)}, ${fl(obj.scale.y)})`
        console.log(text)
    })
}
