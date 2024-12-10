## `auto-ss.ps1`

**Скрипт автоматически собирает спрайтлисты.**

Как это работает:
В директории `assets/auto-ss` лежат файлы конфигураций (.tps) для каждого типа спрайтлиста.
Далее для каждой папки, префикс в названии которой соответствует названию конфигурации, будет собран спрайтлист и json.

_Например_, если есть такая структура директории `assets/auto-ss`
```
./ss.tps  # Конфиг для спрайтлистов
./seq.tps  # Конфиг для секвенций
./ss_main
    | logo.png
    | sword.png
    | board.png
./ss_items
    | one.png
    | two.png
./seq_flash
    | flash_0001.png
    | flash_0002.png
```

Будет собрано
```
./compiled
    | items.png
    | items.json
    | flash.png
    | flash.json
    | main.png
    | main.json
```

Так же, генерируется файл `importSpriteSheets.js`, который экспортирует функцию, для добавления всех спрайтлистов.

Вызывать её так:

```ts
import importSpriteSheets from 'assets/auto-ss/importSpriteSheets'

const assetsLoad: AssetsLoadFunction = () => {
    const imageLoader = new PixiLoader()

    importSpriteSheets(imageLoader, loadSpritesheet)

    return [imageLoader]
}
```

**Обратите внимание**
- В файлах `.tps` обязательно нужно удалить все папки в левом окне.
- Название папки `assets/auto-ss` менять нельзя

---

## `auto-spine.ps1`

**Скрипт автоматически собирает спайны.**

Пример структуры директории `assets/auto-spine`

```
./bat
    | bat.png
    | bat.skel
    | bat.atlas
./wendy
    | wendy.png
    | wendy.skel
    | wendy.atlas
```

Будет сгенерирован файл `importSpines.js`, который экспортирует функцию, для добавления всех спайнов.

Вызывать её так:


```ts
import importSpines from 'assets/auto-spine/importSpines'
import loadSpineSkel from 'lib/applications/2d/loadSpineSkel'

const assetsLoad: AssetsLoadFunction = () => {
    const imageLoader = new PixiLoader()

    importSpines(imageLoader, loadSpineSkel)

    return [imageLoader]
}
```


**Обратите внимание**
- Названия файлов в папках не имеют значения, главное чтобы совпадало расширение
- Если тип файла `.json` то `importSpines` нужно вызывать так: `importSpines(imageLoader, loadSpineJson)`
- Нельзя использовать разные типы файлов (например `.json` и `.skel`), то же касается изображений
- Название папки `assets/auto-spine` менять нельзя

---


## `build.ps1`

Делает итоговый билд. Можно указывать сколько угодно версий/локализаций/сеток в `playable.config.js`.


---

## `webpconvert.ps1`

Конвертирует все .png и .jpg файлы в папке `./assets/` в формат `.webp` и (опционально) делает сжатие.


**Обратите внимание**
- Можно игронрировать файлы или папки, указывая их в `.webpconvertignore`
    - `bg.jpg`, `item_*.png` для файлов
    - `ss_items`, `ss_*` для папок