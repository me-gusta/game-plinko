class DataUser {
    data = {
        skills: [null, null],
        coins: 0,
    }

    // constructor() {
    // }

    install(gp: any) {
        const skills = (gp.player.state.coins || ',')
            .split(',')
            .map((el: string) => String(el) || null)

        Object.assign(this.data, {
            skills,
            coins: gp.player.state.skills,
        })
    }
}

export default new DataUser()
