import { EMOTIONS } from './moodStats';

// I4 hanh trinh cam xuc: ten hien tren thanh phat / hang doi / loi chao trang chu ("Sad → Happy journey")
const labelOf = (key) => EMOTIONS.find((e) => e.key === key)?.label || key;

export const journeyName = ({ from, to }) => `${labelOf(from)} → ${labelOf(to)} journey`;
