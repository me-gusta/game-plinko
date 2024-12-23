import {Container} from 'pixi.js'
import BaseNode from '$lib/BaseNode'

export const RATIO_MIN = 9 / 20
export const RATIO_V_MAX = 0.7
export const RATIO_H_MIN = 1.35

export const vary = (from: number, to: number) => {

    if (!window.screen_size) {
        return from
    }

    const ratio = window.screen_size.width / window.screen_size.height
    const clampedRatio = Math.max(RATIO_MIN, Math.min(RATIO_V_MAX, ratio));

    // Normalize clampedRatio to a 0-1 range based on RATIO_MIN and RATIO_MAX
    const normalizedRatio = (clampedRatio - RATIO_MIN) / (RATIO_V_MAX - RATIO_MIN);

    // Perform linear interpolation
    return from + (to - from) * normalizedRatio;
}


export const scale_to_height = (node: Container, height: number) => {
    const ha = node.height / node.scale.y
    const s = height / ha
    node.scale.set(s)
}


export const scale_to_known = (node: BaseNode) => {
    if (!node.bh || !node.bw) throw Error('cannot scale node'
    )
    const h = node.height / node.scale.y
    const sh = node.bh / h

    const w = node.width / node.scale.x
    const sw = node.bw / w

    node.scale.set(sw, sh)
}


export const x_pad = (parent: Container, child: Container, amount: number, isLeft = true) => {
    const xv = child.width / 2 + amount
    if (isLeft) {
        child.x = xv
        return
    }
    child.x = parent.width - xv
}

export const mock_window = (scale = 1) => {
    return {
        width: window.screen_size.width / scale,
        height: window.screen_size.height,
    } as any
}

const h_fulfill = (element: BaseNode) => ({
    auto: () => {
        w_auto(element)
        scale_to_known(element)
    }
})


const w_fulfill = (element: BaseNode) => ({
    auto: () => {
        h_auto(element)
        scale_to_known(element)
    }
})

export const cover_parent = (element: BaseNode) => {
    const parent = element.parent as BaseNode
    element.bw = parent.bw
    element.bh = parent.bh
}

// SET W

export const w_full = (element: BaseNode, margin = 0) => {
    const parent = element.parent as BaseNode
    element.bw = parent.bw - margin * 2
    return w_fulfill(element)
}

export const w_percent = (element: BaseNode, value: number) => {
    const parent = element.parent as BaseNode
    element.bw = value * parent.bw
    return w_fulfill(element)
}

export const w_const = (element: BaseNode, value: number) => {
    element.bw = value
}

export const w_copy = (element: BaseNode, provider: BaseNode) => {
    element.bw = provider.bw
}

export const w_auto = (element: BaseNode) => {
    if (!element.bh) throw Error('cannot define width')
    const {width, height} = element
    const proportion = width / height
    element.bw = proportion * element.bh
}

// SET H

export const h_full = (element: BaseNode, margin = 0) => {
    const parent = element.parent as BaseNode
    element.bh = parent.bh - margin * 2
    return h_fulfill(element)
}

export const h_copy = (element: BaseNode, provider: BaseNode) => {
    element.bh = provider.bh
    return h_fulfill(element)
}

export const h_auto = (element: BaseNode) => {
    if (!element.bw) throw Error('cannot define height')
    const {width, height} = element
    const proportion = height / width
    element.bh = proportion * element.bw
}

export const h_square = (element: BaseNode) => {
    if (!element.bw) throw Error('cannot define height')
    element.bh = element.bw
}

export const h_percent = (element: BaseNode, value: number) => {
    const parent = element.parent as BaseNode
    element.bh = value * parent.bh
    return h_fulfill(element)
}

export const h_const = (element: BaseNode, value: number) => {
    element.bh = value
}

// ALIGN

export const to_top = (element: BaseNode, margin = 0) => {
    const parent = element.parent as BaseNode
    element.position.y = -parent.bh / 2 + element.bh / 2 + margin
}

export const to_bottom = (element: BaseNode, margin = 0) => {
    const parent = element.parent as BaseNode
    element.position.y = parent.bh / 2 - element.bh / 2 - margin
}

export const to_left = (element: Container, margin = 0) => {
    element.position.x = element.width / 2 + margin
}

export const to_y_zero = (...elements: BaseNode[]) => {
    elements.forEach(el=> el.y = 0)
}

export const to_x_zero = (...elements: BaseNode[]) => {
    elements.forEach(el=> el.x = 0)
}


export const to_zero = (...elements: BaseNode[]) => {
    elements.forEach(el=> {
        el.x = 0
        el.y = 0
        el.scale.set(1)
        el.bh = 0
        el.bw = 0
    })
}

export const to_x_center = (element: BaseNode, margin = 0) => {
    const parent = element.parent as BaseNode
    element.position.x = parent.bw / 2 //- element.bw / 2
}

export const to_right = (element: BaseNode, margin = 0) => {
    const parent = element.parent as BaseNode
    element.position.x = parent.bw - (element.bw / 2) - margin
}

export const ml_from = (anchor: BaseNode, element: BaseNode, margin = 0) => {
    element.position.x = anchor.position.x - anchor.bw /2 - element.bw / 2 - margin
}

export const mr_from = (anchor: BaseNode, element: BaseNode, margin = 0) => {
    element.position.x = anchor.position.x + anchor.bw /2 + element.bw / 2 + margin
}

export const mt_from = (anchor: BaseNode, element: BaseNode, margin = 0) => {
    element.position.y = anchor.position.y + anchor.bh /2 + element.bh / 2  + margin
}

export const mb_from = (anchor: BaseNode, element: BaseNode, margin = 0) => {
    element.position.y = anchor.position.y - anchor.bh /2 - element.bh / 2  - margin
}



