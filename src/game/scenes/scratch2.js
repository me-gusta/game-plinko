
// let i = 0
let probs = [1000]
const main = () => {
    for (let i = 0; i < 10; i++) {
        const v = probs[0] / 10
        const a = v / probs.length
        probs.push(a)
        for (let j = 1; j< probs.length -1; j++) {
            probs[j] += a
        }
        probs[0] -= v
        console.log(i+3, ':' , JSON.stringify(probs.map(el=> Math.floor(el))), ',')
        // console.log(probs.reduce((a,b)=>a+b, 0))
    }
}

main()
