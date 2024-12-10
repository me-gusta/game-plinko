class DataRun {
    data = {
        hp: 10,
        level: 1,
        coins: 0,
    }

    init() {
        Object.assign(this.data, {
            hp: 10,
            level: 1,
            coins: 0,
        })
    }
}


export default new DataRun()
