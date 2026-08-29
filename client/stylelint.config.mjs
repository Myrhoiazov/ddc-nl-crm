/** @type {import('stylelint').Config} */

export default {
    extends: ['stylelint-config-standard-scss'],
    plugins: ['stylelint-scss', 'stylelint-order'],
    rules: {
        'selector-class-pattern': null,
        'color-no-invalid-hex': true,
        'order/properties-order': [
            [
                // Сначала позиционирование
                'position',
                'top',
                'right',
                'bottom',
                'left',
                'z-index',

                // Отображение и флекс-бокс
                'display',
                'flex-direction',
                'justify-content',
                'align-items',
                'flex-wrap',

                // Блочная модель
                'width',
                'min-width',
                'max-width',
                'height',
                'min-height',
                'max-height',
                'margin',
                'padding',

                // Текст
                'font',
                'font-size',
                'font-weight',
                'line-height',
                'color',
                'text-align',
                'text-transform',

                // Фон и бордеры
                'background',
                'border',
                'border-radius',
                'box-shadow',

                // Прочее
                'opacity',
                'visibility',
                'transition',
            ],
            {
                unspecified: 'bottomAlphabetical',
            },
        ],
    },
};
