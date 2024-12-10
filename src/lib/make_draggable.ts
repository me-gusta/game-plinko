import {Container, EventEmitter, FederatedPointerEvent} from 'pixi.js'

// /**
//  @example
//  const point = createTestPoint()
//  point.interactive = true
//  const dragManager = new DragManager(point)
//  dragManager.on('move', ({ x, y }: any) => {
//  point.position.set(x, y)
//  })
//  point.on('pointerdown', dragManager.onDragStart, dragManager)
//  point.on('pointermove', dragManager.onDragMove, dragManager)
//  point.on('pointerup', dragManager.onDragEnd, dragManager)
//  point.on('pointerupoutside', dragManager.onDragEnd, dragManager)
//  */
// class DragManager extends EventEmitter {
//     /** активен ли хотябы один из объектов класса DragManager */
//     public static isActive = false
//
//     private el: Container
//     private isDragging = false
//     private pointer = new Pointer()
//
//     constructor(el: Container) {
//         super()
//         this.el = el
//     }
//
//     private static isValidCoords(x: number, y: number) {
//         const {width, height} = App.screenSize
//         return x > 0 && x < width && y > 0 && y < height
//     }
//
//     onDragStart({data}: InteractionEvent) {
//         if (data.isPrimary && !DragManager.isActive) {
//             DragManager.isActive = true
//             this.isDragging = true
//
//             const {x, y} = this.el.parent.toLocal(data.global)
//
//             this.pointer.start(data.identifier, x, y)
//             this.emit('start', {identifier: data.identifier, x, y})
//         }
//     }
//
//     onDragMove({data}: InteractionEvent) {
//         if (this.isDragging && this.pointer.id === data.identifier) {
//             const {x: globalX, y: globalY} = data.global
//             const {x: localX, y: localY} = this.el.parent.toLocal(data.global)
//             const dx = localX - this.pointer.x
//             const dy = localY - this.pointer.y
//
//             if (DragManager.isValidCoords(globalX, globalY)) {
//                 this.pointer.move(localX, localY)
//                 this.emit('move', {x: localX, y: localY, dx, dy})
//             } else {
//                 this.onDragEnd(null!, true)
//             }
//         }
//     }
//
//     onDragEnd(event: InteractionEvent, isForcibly = false) {
//         if (isForcibly || (this.isDragging && this.pointer.id === event.data.identifier)) {
//             DragManager.isActive = false
//             this.pointer.end()
//             this.isDragging = false
//
//             this.emit('end', {isMoved: this.pointer.isMoved})
//         }
//     }
// }
//
// export const createDefault = (el: Container) => {
//     el.interactive = true
//     const dragManager = new DragManager(el)
//     dragManager.on('move', ({dx, dy}: any) => {
//         el.x += dx
//         el.y += dy
//     })
//     el.on('pointerdown', dragManager.onDragStart, dragManager)
//     el.on('pointermove', dragManager.onDragMove, dragManager)
//     el.on('pointerup', dragManager.onDragEnd, dragManager)
//     el.on('pointerupoutside', dragManager.onDragEnd, dragManager)
// }

export default (el: Container) => {
    el.interactive = true
    let pointerId = -1
    const on_drag_start = (event: FederatedPointerEvent) => {
        if (pointerId !== -1) return
        el.emit('dragstart', event)
        pointerId = event.pointerId
    }

    const on_drag_move = (event: FederatedPointerEvent) => {
        if (pointerId !== event.pointerId) return
        el.emit('dragmove', event)
    }

    const on_drag_end = (event: FederatedPointerEvent) => {
        if (pointerId === event.pointerId) {
            pointerId = -1
            el.emit('dragend', event)
        }
    }

    el.on('pointerdown', on_drag_start)
    el.on('pointermove', on_drag_move)
    el.on('pointerup', on_drag_end)
    el.on('pointerupoutside', on_drag_end)
    el.on('pointerout', on_drag_end)
}
