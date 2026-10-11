import SunArt from '../assets/icons/emojione_sun.svg?react';
import './MoodIcon.scss';

// Icon cam xuc dong (SVG + CSS animation, khong can thu vien):
// happy = mat troi · sad = may mua · angry = lua · neutral = bong tuyet · surprise (hien thi "Explore") = mat troi xua tan dam may.
// Khong hien chu: ten cam xuc chi nam trong aria-label/title (cho trinh doc man hinh + re chuot).
const LABELS = { happy: 'Happy', sad: 'Sad', angry: 'Angry', surprise: 'Explore', neutral: 'Neutral' };

// happy: mat troi moi cua nguoi dung (assets/icons/emojione_sun.svg), quay cham + toa sang nhe.
const Sun = () => (
    <g className="sun-spin happy-sun">
        <SunArt x="2" y="2" width="60" height="60" />
    </g>
);

// surprise (hien thi "Explore", tam trang muon kham pha): mat troi nho nap sau may (giong assets/icons/emojione_sun-behind-cloud.svg) bat ngo
// phong to bung ra, day dam may nho lai xuong goc duoi phai, roi may che lai -> lap lai (MoodIcon.scss).
// May tach rieng (2 path lay tu emojione_sun-behind-cloud.svg, nhan 4 cho khung 64) de dua di doc lap voi mat troi.
const SunBehindCloud = () => (
    <>
        <g className="sun-reveal">
            <g className="sun-spin">
                <SunArt x="2" y="2" width="60" height="60" />
            </g>
        </g>
        {/* lop ngoai chay animation (CSS transform), lop trong giu phep phong to: CSS transform se ghi de thuoc tinh transform */}
        <g className="sun-cloud">
            <g transform="translate(0 -8) scale(4)">
                <path d="M4.3001 14.2751C4.0501 14.2751 3.8001 14.2251 3.5751 14.1501C2.6251 13.8251 1.9751 12.9251 1.9751 11.9001C1.9751 11.2251 2.2751 10.5501 2.7751 10.1001C2.9001 9.9751 3.0501 9.8751 3.2001 9.8001L3.3501 9.2501C3.7251 7.8751 4.9751 6.9251 6.3751 6.9251C6.5251 6.9251 6.6501 6.9251 6.8251 6.9501L7.2001 7.0251L7.2501 6.9001C7.8251 5.8501 8.9001 5.2251 10.0501 5.2251C11.8251 5.2251 13.2501 6.7001 13.2501 8.5001V8.8251C13.3751 8.8751 13.5251 8.9501 13.6501 9.0251C14.5001 9.5251 15.0251 10.4751 15.0251 11.4751C15.0251 12.8001 14.1501 13.9251 12.8751 14.2251C12.6751 14.2751 12.4501 14.3001 12.2501 14.3001H4.3001V14.2751Z" fill="white" />
                <path d="M10.075 5.7C11.575 5.7 12.8 6.95 12.8 8.5V8.725C12.175 8.775 11.6 9.025 11.15 9.425C11.475 9.225 11.875 9.125 12.3 9.125C12.45 9.125 12.6 9.15 12.75 9.175C13 9.225 13.225 9.325 13.45 9.45C14.125 9.85 14.6 10.6 14.6 11.475C14.6 12.575 13.85 13.525 12.825 13.75C12.65 13.8 12.5 13.8 12.3 13.8H4.3C4.1 13.8 3.9 13.775 3.725 13.7C2.975 13.45 2.45 12.725 2.45 11.9C2.45 11.325 2.7 10.825 3.1 10.475C3.275 10.325 3.475 10.2 3.7 10.1C3.9 10.025 4.1 10 4.325 10C4.925 10 5.45 10.3 5.8 10.75H5.825C5.425 10 4.7 9.475 3.825 9.4C4.15 8.25 5.175 7.4 6.4 7.4C6.525 7.4 6.65 7.425 6.775 7.425C7.025 7.45 7.25 7.525 7.475 7.625C8.3 8 8.9 8.8 9.05 9.75V9.725C9.05 8.65 8.5 7.7 7.7 7.15C8.15 6.275 9.025 5.7 10.075 5.7ZM10.075 4.75C8.825 4.75 7.65 5.4 6.975 6.5H6.9C6.7 6.475 6.55 6.45 6.375 6.45C4.775 6.45 3.325 7.55 2.9 9.125L2.775 9.5C2.65 9.575 2.55 9.65 2.45 9.75C1.85 10.275 1.5 11.075 1.5 11.9C1.5 13.125 2.275 14.225 3.425 14.6C3.7 14.7 4 14.75 4.3 14.75H12.275C12.525 14.75 12.75 14.725 13 14.675C14.475 14.325 15.5 13 15.5 11.475C15.5 10.3 14.875 9.2 13.875 8.625L13.725 8.55V8.525C13.725 6.425 12.1 4.75 10.075 4.75Z" fill="#75D6FF" />
            </g>
        </g>
    </>
);

const RainCloud = () => (
    <>
        <g className="rain-drops" stroke="#4DA3FF" strokeWidth="3.5" strokeLinecap="round">
            <line className="drop d1" x1="22" y1="40" x2="19" y2="48" />
            <line className="drop d2" x1="32" y1="40" x2="29" y2="48" />
            <line className="drop d3" x1="42" y1="40" x2="39" y2="48" />
        </g>
        <path
            className="cloud"
            d="M19 40a9 9 0 0 1-1-17.9A12 12 0 0 1 41 19a10 10 0 0 1 3 21z"
            fill="#B7C3D6"
        />
        <path d="M19 40a9 9 0 0 1-1-17.9A12 12 0 0 1 41 19" fill="none" stroke="#E3EAF4" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </>
);

const Fire = () => (
    <g className="flame">
        <path d="M32 5c2 9 13 14 13 28a13 13 0 0 1-26 0c0-6 3-9 5-12 1 4 3 6 5 6-2-8 0-15 3-22z" fill="#FF5A1F" />
        <path className="flame-mid" d="M32 24c1 6 8 9 8 18a8 8 0 0 1-16 0c0-4 2-6 4-8 1 3 2 4 3 4-1-5 0-10 1-14z" fill="#FF9A1F" />
        <path className="flame-core" d="M32 38c1 3 4 5 4 9a4 4 0 0 1-8 0c0-3 3-5 4-9z" fill="#FFE066" />
    </g>
);

const Snowflake = () => (
    <g className="snow" stroke="#BFE6FF" strokeWidth="3.5" strokeLinecap="round" fill="none">
        {[0, 60, 120].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 32 32)`}>
                <line x1="32" y1="6" x2="32" y2="58" />
                <polyline points="26,12 32,18 38,12" strokeWidth="3" />
                <polyline points="26,52 32,46 38,52" strokeWidth="3" />
            </g>
        ))}
        <circle cx="32" cy="32" r="3.5" fill="#E8F6FF" stroke="none" />
    </g>
);

const ART = { happy: Sun, sad: RainCloud, angry: Fire, neutral: Snowflake, surprise: SunBehindCloud };

const MoodIcon = ({ emotion, size = 28, className = '' }) => {
    const key = emotion in ART ? emotion : 'neutral';
    const Art = ART[key];
    const label = LABELS[key];
    return (
        <svg
            className={`mood-icon mi-${key} ${className}`}
            viewBox="0 0 64 64"
            width={size}
            height={size}
            role="img"
            aria-label={label}
        >
            <title>{label}</title>
            <Art />
        </svg>
    )
}

export default MoodIcon
