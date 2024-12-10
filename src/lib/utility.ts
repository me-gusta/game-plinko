import {Container, Matrix, Point, RenderTexture} from 'pixi.js'
import {IPoint} from '$lib/Vector'

export const renderToTexture = (() => {
    const tParent = new Container()
    const tTransform = new Matrix()
    const tAnchor = new Point()
    const tPadding = new Point()

    return (
        object: Container,
        params: {
            padding?: IPoint | number,
            useObjectScale?: boolean,
            skipUpdate?: boolean,
        } = {},
    ) => {
        if (params.padding) {
            if (typeof params.padding === 'number') {
                tPadding.set(params.padding)
            } else {
                tPadding.copyFrom(params.padding)
            }
        }

        const skipUpdate = params.skipUpdate ?? false
        const useObjectScale = params.useObjectScale ?? false

        if (!skipUpdate) {
            if (!object.parent) object.parent = tParent
            object.updateTransform({})
        }

        let { width, height } = object

        let translateX: number
        let translateY: number
        if (useObjectScale) {
            translateX = tPadding.x / 2 / object.scale.x
            translateY = tPadding.y / 2 / object.scale.y
        } else {
            width /= object.scale.x
            height /= object.scale.y
            tPadding.x /= object.scale.x
            tPadding.y /= object.scale.y
            translateX = tPadding.x / 2
            translateY = tPadding.y / 2
        }

        if ('anchor' in object) tAnchor.copyFrom(object.anchor as any)

        translateX += width * tAnchor.x
        translateY += height * tAnchor.y

        tTransform.translate(translateX, translateY)
        if (useObjectScale) tTransform.scale(object.scale.x, object.scale.y)
        tTransform.append(object.worldTransform.clone().invert())

        const renderTexture = RenderTexture.create({ width: width + tPadding.x, height: height + tPadding.y })
        // @ts-ignore
        window.app.renderer.render(object, { renderTexture, transform: tTransform })

        // #region reset to default after render
        if (object.parent === tParent) object.parent = null as any
        tTransform.identity()
        tPadding.set(0)
        tAnchor.set(0)
        // #endregion

        return renderTexture
    }
})()
