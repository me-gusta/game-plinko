export default function () {
    const virtualModuleId = 'virtual:load-fonts'
    const resolvedVirtualModuleId = '\0' + virtualModuleId
    return {
        name: 'load-fonts', // required, will show up in warnings and errors
        resolveId(id) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId
            }
        },
        async load(id) {
            if (id === resolvedVirtualModuleId) {
                const code = `
export default () => {
const cssString = '';
const styleElement = document.createElement('style');
styleElement.innerHTML = cssString;
document.head.appendChild(styleElement);
}`
                return code
            }
        },
    }
}
