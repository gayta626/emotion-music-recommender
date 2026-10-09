import './MoodIcon.scss';

// Icon cam xuc dong (SVG + CSS animation, khong can thu vien):
// happy = mat troi · sad = may mua · angry = lua · neutral = bong tuyet · surprise = mat deo kinh.
// Khong hien chu: ten cam xuc chi nam trong aria-label/title (cho trinh doc man hinh + re chuot).
const LABELS = { happy: 'Happy', sad: 'Sad', angry: 'Angry', surprise: 'Surprised', neutral: 'Neutral' };

const Sun = () => (
    <>
        <g className="sun-rays">
            {Array.from({ length: 8 }, (_, i) => (
                <rect key={i} x="30" y="3" width="4" height="10" rx="2" fill="#FFC53D" transform={`rotate(${i * 45} 32 32)`} />
            ))}
        </g>
        <circle className="sun-core" cx="32" cy="32" r="12" fill="#FFB020" />
        <circle cx="32" cy="32" r="12" fill="url(#mi-sun-shine)" />
        <defs>
            <radialGradient id="mi-sun-shine" cx="35%" cy="30%" r="70%">
                <stop offset="0" stopColor="#FFF3B0" stopOpacity="0.9" />
                <stop offset="1" stopColor="#FFB020" stopOpacity="0" />
            </radialGradient>
        </defs>
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

const CoolFace = () => (
    <g className="cool">
        <circle cx="32" cy="32" r="25" fill="#FFD43B" />
        <circle cx="32" cy="32" r="25" fill="url(#mi-face-shine)" />
        <g className="glasses">
            <rect x="9" y="22" width="20" height="14" rx="6" fill="#1D2330" />
            <rect x="35" y="22" width="20" height="14" rx="6" fill="#1D2330" />
            <rect x="29" y="26" width="6" height="3" fill="#1D2330" />
            <path d="M12 25h6M38 25h6" stroke="#6C7A99" strokeWidth="2" strokeLinecap="round" />
        </g>
        <ellipse className="mouth" cx="32" cy="46" rx="5" ry="6" fill="#7A3E12" />
        <defs>
            <radialGradient id="mi-face-shine" cx="35%" cy="28%" r="75%">
                <stop offset="0" stopColor="#FFF3B0" stopOpacity="0.8" />
                <stop offset="1" stopColor="#FFD43B" stopOpacity="0" />
            </radialGradient>
        </defs>
    </g>
);

const ART = { happy: Sun, sad: RainCloud, angry: Fire, neutral: Snowflake, surprise: CoolFace };

const MoodIcon = ({ emotion, size = 28, className = '' }) => {
    const Art = ART[emotion] || ART.neutral;
    const label = LABELS[emotion] || LABELS.neutral;
    return (
        <svg
            className={`mood-icon mi-${emotion in ART ? emotion : 'neutral'} ${className}`}
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
