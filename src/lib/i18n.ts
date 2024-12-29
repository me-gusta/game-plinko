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

export default transposeObject(csv, 'ru')
