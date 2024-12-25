import {EventEmitter} from 'pixi.js'

export default class Value extends EventEmitter {
    amount: number

    constructor(amount: number) {
        super()
        this.amount = amount
    }

    set(amount: number) {
        const prev = this.amount
        this.amount = amount
        this.amount = Math.floor(this.amount)
        this.emit('change', {
            prev,
            value: this.amount,
        })
    }

    mul(amount: number) {
        const prev = this.amount
        this.amount *= amount
        this.amount = Math.floor(this.amount)
        this.emit('change', {
            prev,
            value: this.amount,
        })
    }

    add(amount: number) {
        const prev = this.amount
        this.amount += amount
        this.amount = Math.floor(this.amount)
        this.emit('change', {
            prev,
            value: this.amount,
        })
    }

    sub(amount: number) {
        this.add(-amount)
    }
}
