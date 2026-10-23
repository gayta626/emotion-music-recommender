// Loc + sap xep thanh thu vien (utils/libraryOrder.js). Chay: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { orderLibrary } from '../src/utils/libraryOrder.js';

const artists = [
    { id: 1, name: 'Sơn Tùng M-TP' },
    { id: 2, name: 'Đen Vâu' },
    { id: 3, name: 'Adele' },
    { id: 4, name: 'Bùi Anh Tuấn' },
];
const names = (list) => list.map((a) => a.name);

test('tim khong dau, khong phan biet hoa thuong', () => {
    assert.deepEqual(names(orderLibrary(artists, { query: 'son tung' })), ['Sơn Tùng M-TP']);
    assert.deepEqual(names(orderLibrary(artists, { query: 'DEN' })), ['Đen Vâu']);
    assert.deepEqual(names(orderLibrary(artists, { query: '  tu ' })), ['Sơn Tùng M-TP', 'Bùi Anh Tuấn']);
    assert.deepEqual(orderLibrary(artists, { query: 'xyz' }), []);
});

test('Recents: moi nghe len dau, chua nghe giu thu tu goc', () => {
    const last = { 3: 200, 2: 100 };
    const list = orderLibrary(artists, { sort: 'recents', recent: (a) => last[a.id] || 0 });
    assert.deepEqual(names(list), ['Adele', 'Đen Vâu', 'Sơn Tùng M-TP', 'Bùi Anh Tuấn']);
});

test('Recently added: theo khoa added giam dan', () => {
    assert.deepEqual(orderLibrary(artists, { sort: 'added', added: (a) => a.id }).map((a) => a.id), [4, 3, 2, 1]);
});

test('Alphabetical: theo chu cai tieng Viet (Đ sau D, khong dau cung nhom)', () => {
    const list = orderLibrary([...artists, { id: 5, name: 'Dương Domic' }], { sort: 'alpha' });
    assert.deepEqual(names(list), ['Adele', 'Bùi Anh Tuấn', 'Dương Domic', 'Đen Vâu', 'Sơn Tùng M-TP']);
});

test('khong sua mang goc', () => {
    const copy = [...artists];
    orderLibrary(artists, { sort: 'alpha' });
    assert.deepEqual(artists, copy);
});
