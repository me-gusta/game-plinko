import csv from '$src/i18n.csv'

type I18n = {
    play: string
    settings: string
    music: string
    sound: string
    bumper: string
    speed: string
    cash: string
    back: string
    next: string
}

const transposeObject = (obj: any[], regionKey: string): I18n => {
    const out: any = {}
    for (const ent of obj) {
        out[ent.key] = ent[regionKey]
        if (!ent[regionKey]) throw Error('i18n error')
    }
    return out
}

class Translation {
    get i18n() {
        if (!window.i18n_lang) throw Error('no lang set')
        const obj = transposeObject(csv, window.i18n_lang)
        return obj
    }
}
const translation = new Translation()

export default translation.i18n

