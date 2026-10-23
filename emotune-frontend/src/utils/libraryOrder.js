// Thanh thu vien (SideBar): loc theo o tim kiem + sap xep Recents / Recently added / Alphabetical.
// Ham thuan -> test/libraryOrder.test.js
import { plain } from './text.js';

export const SORTS = [
    { key: 'recents', label: 'Recents' },
    { key: 'added', label: 'Recently added' },
    { key: 'alpha', label: 'Alphabetical' },
];

// items: [{ name, ... }]; recent(item) / added(item) -> so (lon = moi hon), 0 = chua co.
// Bang nhau (vd ca si chua nghe lan nao) thi giu thu tu goc (sort cua JS on dinh).
export const orderLibrary = (items, { query = '', sort = 'recents', recent = () => 0, added = () => 0 } = {}) => {
    const q = plain(query.trim());
    const found = q ? items.filter((item) => plain(item.name).includes(q)) : [...items];
    if (sort === 'alpha') return found.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));
    const key = sort === 'added' ? added : recent;
    return found.sort((a, b) => key(b) - key(a));
};
