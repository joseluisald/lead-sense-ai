import collapse from '@alpinejs/collapse';
import initAlpineStores from './scripts/main.js';

export default (Alpine) => {
    Alpine.plugin(collapse);
    initAlpineStores(Alpine);
};
