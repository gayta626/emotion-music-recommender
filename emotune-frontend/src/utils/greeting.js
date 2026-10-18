import { EMOTIONS, NEGATIVE } from './moodStats';
import { STALE_MS, timeAgo } from './moodSession';

// I3 loi chao ca nhan dau trang chu: ham thuan, tu tinh huong -> { title, line, action }
// action: "now-playing" (mo man dang phat) | "scan" (quet lai) | "play" (phat bai hop cam xuc, khong bat camera)

const PART_OF_DAY = (hour) => (hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening');

// 1 cau theo cam xuc lan quet gan nhat (surprise hien la "Explore")
const MOOD_LINES = {
    happy: "You're in a great mood — let's keep it going!",
    sad: 'You seem a bit down today. Here is something gentle for you.',
    angry: 'Feeling a little tense? Let some music take the edge off.',
    neutral: 'A calm moment — want something easy to listen to?',
    surprise: 'In the mood to explore? NYX has something new for you.',
};

const labelOf = (key) => (EMOTIONS.find((e) => e.key === key)?.label || key).toLowerCase();

// name: ten tai khoan; hour: gio hien tai; now: Date.now();
// lastMood: { emotion, at } | null; journey: { from, to, step, total } | null (dang chay hanh trinh I4);
// cheerOn: buon/gian keo dai (cung cach tinh voi the "Your mood this week")
export const buildGreeting = ({ name, hour, now, lastMood, journey, cheerOn }) => {
    const title = `Good ${PART_OF_DAY(hour)}${name ? `, ${name}` : ''}.`;

    // 1) dang chay hanh trinh cam xuc -> bao dang o buoc may
    if (journey) {
        return {
            title,
            line: `NYX is easing you from ${labelOf(journey.from)} toward ${journey.to === 'happy' ? 'happier' : labelOf(journey.to)} songs (${journey.step}/${journey.total}).`,
            action: 'now-playing',
            emotion: journey.from,
        };
    }
    // 2) chua quet / lan quet cu hon 30 phut -> moi quet lai (cam xuc cu co the da khac)
    if (!lastMood) {
        return { title, line: 'How are you feeling? A quick scan picks the right song.', action: 'scan', emotion: 'neutral' };
    }
    if (now - lastMood.at > STALE_MS) {
        return { title, line: `Your last scan was ${timeAgo(now - lastMood.at)} — how are you now?`, action: 'scan', emotion: lastMood.emotion };
    }
    // 3) buon/gian keo dai (hanh trinh da chay xong) -> NYX van chen bai tuoi hon
    if (cheerOn && NEGATIVE.includes(lastMood.emotion)) {
        return {
            title,
            line: "You've been down for a few days — NYX is mixing in brighter songs for you.",
            action: 'play',
            emotion: lastMood.emotion,
        };
    }
    // 4) binh thuong: theo cam xuc lan quet gan nhat
    return { title, line: MOOD_LINES[lastMood.emotion] || MOOD_LINES.neutral, action: 'play', emotion: lastMood.emotion };
};
