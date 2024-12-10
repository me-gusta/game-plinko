import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'

export default [
    { files: ['**/*.{js,mjs,cjs,ts}'] },
    { languageOptions: { globals: globals.browser } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    importPlugin.flatConfigs.recommended,
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'import/named': 'off',
            'no-redeclare': 'off',
            '@typescript-eslint/no-redeclare': ['error'],
            'no-shadow': 'off',
            '@typescript-eslint/no-shadow': 'error',
            'no-unused-vars': 'off',
            'import/no-unresolved': 'off',
            '@typescript-eslint/no-unused-vars': 'warn',
            'no-use-before-define': 'off',
            '@typescript-eslint/no-use-before-define': 'off',
            'no-useless-constructor': 'off',
            '@typescript-eslint/no-useless-constructor': 'error',
            'no-empty-function': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            'default-param-last': 'off',
            '@typescript-eslint/default-param-last': 'error',
            'no-dupe-class-members': 'off',
            '@typescript-eslint/no-dupe-class-members': 'error',
            'indent': ['warn', 4],
            'curly': ['warn', 'multi-line'],
            // #region OFF
            'import/order': 'off',
            // заключение в кавычки имен полей объекта
            'quote-props': 'off',

            // https://eslint.org/docs/rules/linebreak-style
            'linebreak-style': 'off',

            // символ ";" в конце строки
            'semi': 'off',

            // запрещает использавание символа "_" в нейминге
            'no-underscore-dangle': 'off',

            // запрещает использование инкремента и декремента
            // "no-plusplus": "off",

            // запрещает alert, confirm
            'no-alert': 'off',

            // простит делать метод статическим если нет this https://eslint.org/docs/rules/class-methods-use-this
            'class-methods-use-this': 'off',

            // запрещает мутации полей у объектов, переданных в функцию в качестве параметров
            'no-param-reassign': 'off',
            // #endregion OFF

            // #region WARN
            // запрещает указания расширений файлов .js .json
            'import/extensions': ['warn', 'never', { 'json': 'always' }],

            // запрещает скрытые символы пробела
            'no-trailing-spaces': 'warn',

            // запрещает нестрогое сравнение (== и !=)
            'eqeqeq': 'warn',

            // требует одну пустая строка в конце файла
            'eol-last': 'warn',

            'no-bitwise': 'warn',

            // максимальная длина строки
            'max-len': ['warn', 150],

            // отступы между полями и методами класса
            'lines-between-class-members': ['warn', 'always', { 'exceptAfterSingleLine': true }],
            // #endregion WARN

            // #region ERROR
            // устанавливает максимальное число классов в файле
            'max-classes-per-file': ['error', 4],

            // переносы строк в объектах
            'object-curly-newline': ['error', { 'ObjectPattern': { 'multiline': true } }],

            /**
             * "dot-notation" запрещает использование синтаксиса object['property'] если это возмножно
             * текущая настройка: разрешаем синтаксис object['property'], если нейминг property соответствует snake_case
             */
            'dot-notation': ['error', { 'allowPattern': '^[a-z]+(_[a-z]+)+$' }]
            // #endregion ERROR
        }
    }
]
