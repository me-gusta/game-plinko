import BaseNode from '$lib/BaseNode'

const entaglements_e_to_n = new Map()
const entaglements_n_to_e = new Map()
const entanglements_names = new Map()

export const entangle = (
    obj: BaseNode, // basically something with an "slug"
    ent: any, // basically something with an "id"
    // ...names: any
) => {
    const names = (obj as any).shared_keys
    entaglements_e_to_n.set(ent.id, obj)
    entaglements_n_to_e.set(obj.slug, ent)
    entanglements_names.set(ent.id, names)

    for (const name of names) {
        modify(ent, name).set(ent[name])
    }
}

export const untangle = (a: any) => {
    if (a.id) {
        const obj = entaglements_e_to_n.get(a.id)
        entaglements_n_to_e.delete(obj.slug)
        entaglements_e_to_n.delete(a.id)
    } else {
        const ent = entaglements_n_to_e.get(a.slug)
        entaglements_e_to_n.delete(ent.id)
        entaglements_n_to_e.delete(a.slug)
    }
    throw Error(`incorrect argument ${a}`)
}

export const modify = (ent: any, name: string) => {
    return {
        set: (value: string) => {
            const names = entanglements_names.get(ent.id)
            ent[name] = value
            if (!names.includes(name)) return

            const obj = entaglements_e_to_n.get(ent.id)
            obj.emit(`set_property`, name, value)
        },
    }
}
