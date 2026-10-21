import { useId } from 'react';
import './MoodIcon.scss';

// Icon cam xuc kieu "net manh" (nguoi dung chon kieu B ngay 22/10, thay bo icon thoi tiet cu: mat troi / may mua / lua / bong tuyet):
// vong tron vien mau cam xuc + nen mo cung mau + mat ve bang net. Explore (ma "surprise") = ngoi sao la ban = muon kham pha.
// 22/10 (lan 2) "noi hon": net 4.4, nen trong vong la gradient toa sang (diem sang tren trai), phat sang nhe cung mau.
// Chuyen dong nhe (MoodIcon.scss): vui nhun, buon roi nuoc mat, gian rung, binh thuong chop mat, Explore sao lap lanh.
// Khong hien chu: ten cam xuc chi nam trong aria-label/title (cho trinh doc man hinh + re chuot).
const LABELS = { happy: 'Happy', sad: 'Sad', angry: 'Angry', surprise: 'Explore', neutral: 'Neutral' };
// mau net theo bang mau cam xuc cua web (mau dam hon mot chut de net manh van ro tren nen toi)
const COLORS = { happy: '#F2A53A', sad: '#6F93FF', angry: '#F0587E', neutral: '#2FC2B2', surprise: '#B57BF5' };

// nen trong vong: gradient toa tron (dam o goc tren trai -> nhat dan), id rieng moi icon (useId) vi 1 trang co nhieu icon
const Ring = ({ color }) => {
    const id = useId();
    return (
        <>
            <defs>
                <radialGradient id={id} cx="35%" cy="30%" r="75%">
                    <stop offset="0" stopColor={color} stopOpacity="0.55" />
                    <stop offset="0.6" stopColor={color} stopOpacity="0.22" />
                    <stop offset="1" stopColor={color} stopOpacity="0.12" />
                </radialGradient>
            </defs>
            <circle cx="32" cy="32" r="24" fill={`url(#${id})`} />
        </>
    );
};

const Happy = () => (
    <g className="mi-bob">
        <Ring color={COLORS.happy} />
        <path d="M22 28q3-4 6 0M36 28q3-4 6 0" />
        <path d="M21 37q11 11 22 0" />
    </g>
);

const Sad = () => (
    <>
        <Ring color={COLORS.sad} />
        <path d="M22 25l6-2M42 25l-6-2" />
        <path d="M24 30v1M40 30v1" />
        <path d="M23 44q9-7 18 0" />
        <path className="mi-tear" d="M41 35q3 4 0 6.5q-3-2.5 0-6.5z" fill="#9DC2FF" stroke="none" />
    </>
);

const Angry = () => (
    <g className="mi-shake">
        <Ring color={COLORS.angry} />
        <path d="M20 23l8 4M44 23l-8 4" />
        <path d="M25 32v1M39 32v1" />
        <path d="M23 44q9-5 18 0" />
    </g>
);

const Neutral = () => (
    <>
        <Ring color={COLORS.neutral} />
        <path className="mi-blink" d="M24 29v1M40 29v1" />
        <path d="M23 41h18" />
    </>
);

const Explore = () => (
    <>
        <Ring color={COLORS.surprise} />
        <path className="mi-twinkle" d="M32 16l5 11 11 5-11 5-5 11-5-11-11-5 11-5z" fill={COLORS.surprise} stroke="none" />
        <circle cx="32" cy="32" r="3" fill="#2b0f4f" stroke="none" />
    </>
);

const ART = { happy: Happy, sad: Sad, angry: Angry, neutral: Neutral, surprise: Explore };

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
            fill="none"
            stroke={COLORS[key]}
            strokeWidth="4.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            // phat sang cung mau, to theo co icon (icon nho 16px thi sang it)
            style={{ filter: `drop-shadow(0 0 ${Math.max(2, Math.round(size / 9))}px ${COLORS[key]}99)` }}
        >
            <title>{label}</title>
            <Art />
        </svg>
    )
}

export default MoodIcon
