import {random_choice, random_int, shuffle_array} from '$lib/random'
import {merge_objects} from '$src/game/utility'

const hp_gen: any = {
    bat: 1.5,
    zombie: 3.5,
}

const dif_map: any = {
    1: {
        common: ['spider', 'bat'],
        rare: ['zombie'],
    },
    2: {
        rare: ['zombie'],
    },
    5: {
        rare: ['rat'],
    },
    7: {
        epic: ['worm'],
    },
    10: {
        legend: ['ghost'],
    },
    15: {
        common: ['snake'],
    },
    20: {
        epic: ['headless'],
    },
    25: {
        epic: ['zombie'],
    },
    27: {
        legend: ['dragon'],
    },
}


const dif_map_weapons: any = {
    1: ['mace'],
    3: ['whip'],
    8: ['dagger'],
    13: ['pan'],
    15: ['knuckles'],
    22: ['crowbar'],
}

const dif_map_foods: any = {
    1: ['cheese'],
    16: ['omlet'],
    21: ['steak'],
}


const type_to_amount = {
    mob: 50,
    food: 11,
    weapon: 14,
}

export type ECard = {
    type: string
    kind: string
    hp: number
}

export const gen_deck = (cfg: { hp: number, level: number }) => {
    const {hp, level} = cfg

    const calc_mob_hp = () => random_int(hp - 4, hp - 1)

    let mob_list: any = {}
    const weapon_list: any = []
    const food_list: any = []
    for (let i = level; i > 0; i--) {
        mob_list = merge_objects(mob_list, dif_map[i] || {})
        weapon_list.push(...(dif_map_weapons[i] || []))
        food_list.push(...(dif_map_foods[i] || []))
    }

    const a_total = type_to_amount.mob + type_to_amount.food + type_to_amount.weapon
    const a_mobs = type_to_amount.mob
    const a_mobs_common = Math.floor(0.7 * a_mobs)
    // console.log(`i am gonna make ${a_mobs_common} common mobs`)

    const c_mob_common = []
    for (let i = 0; i < a_mobs_common; i++) {
        const kind = random_choice(mob_list.common)
        const hp = Math.floor(calc_mob_hp() * (hp_gen[kind] || 1))
        c_mob_common.push({type: 'mob', kind, hp})
    }
    // console.log('here they are:', c_mob_common)
    // console.log()
    // console.log(`i am gonna make ${a_mobs - a_mobs_common} other mobs mobs`)
    const c_mob_uncommon = []

    delete mob_list.common
    const tiers = Object.keys(mob_list)
    for (let i = 0; i < a_mobs - a_mobs_common; i++) {
        const tier = random_choice(tiers)
        const kind = random_choice(mob_list[tier])
        const hp = Math.floor(calc_mob_hp() * (hp_gen[kind] || 1))
        c_mob_uncommon.push({type: 'mob', kind, hp})
    }
    // console.log('here they are:', c_mob_uncommon)
    // console.log()

    const c_mobs = [...c_mob_common, ...c_mob_uncommon]

    // console.log(`i am gonna make ${a_total - a_mobs} good cards`)

    const c_good = []

    const ratio_weapons_all_to_basic = 0.6
    const a_weapons_basic = Math.floor(ratio_weapons_all_to_basic * type_to_amount.weapon)
    for (let i = 0; i < a_weapons_basic; i++) {
        c_good.push({type: 'weapon', kind: 'sword', hp: 1})
    }
    for (let i = 0; i < type_to_amount.weapon - a_weapons_basic; i++) {
        const kind = random_choice(weapon_list)
        c_good.push({type: 'weapon', kind, hp: 1})
    }
    for (let i = 0; i < type_to_amount.food; i++) {
        const kind = random_choice(food_list)
        c_good.push({type: 'food', kind, hp: 1})
    }

    {
        const current_card_amount = c_mobs.length + c_good.length

        for (let i = 0; i < a_total - current_card_amount; i++) {
            c_good.push({type: 'weapon', kind: 'sword', hp: 1})
        }
    }

    const sum_hp_mob = c_mobs.map(el => el.hp).reduce((a, b) => a + b, 0)
    const ratio_hp_mob_to_good = 1.2
    const sum_hp_good = Math.ceil(sum_hp_mob * ratio_hp_mob_to_good) - c_good.length

    for (let i = 0; i < sum_hp_good; i++) {
        const c = random_choice(c_good)
        c.hp += 1
    }

    // console.log('here they are:', c_good)
    // console.log()

    shuffle_array(c_good)
    shuffle_array(c_mobs)

    const mob_names_at_end = ['zombie']
    const c_mobs_at_end: any[] = []
    const c_mobs_at_center = c_mobs.filter(el => {
        const is_at_end = mob_names_at_end.includes(el.kind)
        if (is_at_end) c_mobs_at_end.push(el)
        return !is_at_end
    })

    const c_all: any[][] = Array.from({length: 25}, () => Array(3).fill(undefined))

    for (let row = random_int(0, 1); row < 24; row += random_int(1, 3)) {
        const col = random_int(0, 2)
        c_all[row][col] = c_good.pop()
    }

    c_mobs_at_end.forEach((mob, i) => {
        let has_set = false
        while (!has_set) {
            const row = random_int(10, 24)
            const col = random_int(0, 2)
            if (c_all[row][col]) continue
            c_all[row][col] = mob
            has_set = true
        }
    })

    const c_rest = [...c_good, ...c_mobs_at_center]
    shuffle_array(c_rest)

    c_all.forEach(row => {
        row.forEach((cell, col) => {
            if (!cell) row[col] = c_rest.pop()
        })
    })
    c_all.reverse()

    return c_all as [ECard, ECard, ECard][]
}


