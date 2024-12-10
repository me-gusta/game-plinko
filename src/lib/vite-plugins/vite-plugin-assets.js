import * as fs from 'fs'

export default function () {
    const virtualModuleId = 'virtual:assets'
    const resolvedVirtualModuleId = '\0' + virtualModuleId
    return {
        name: 'asset-loader', // required, will show up in warnings and errors
        resolveId(id) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId
            }
        },
        async load(id) {
            if (id === resolvedVirtualModuleId) {
                const files = await fs.promises.readdir(process.cwd() + '\\public\\assets\\img' );
                const calls = []
                const aliases = []
                for (let fileName of files) {
                    const alias = fileName.split('.')[0]
                    calls.push(
                        `Assets.add({ alias: '${alias}', src: 'assets/img/${fileName}' });`
                    )
                    if (aliases.includes(alias))
                        throw Error(`Assets with alias ${alias} already has been defined`)
                    aliases.push(`'${alias}'`)
                }
                calls.push(
                    `await Assets.load([${aliases.join(', ')}]);`,
                    `console.log('assets loaded')`
                )
                return `import { Assets } from 'pixi.js';\nexport default async () => { ${calls.join('\n')} }`
            }
        },
    }
}
