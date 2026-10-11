// Tim "thich bai" (♥): rong = chua thich, to day = da thich. Mau theo currentColor
const HeartIcon = ({ filled = false }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path
            d="M12 20.3s-7.8-4.6-9.3-9.6C1.8 7.5 3.9 4.4 7.2 4.4c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.4 3.1 4.5 6.3-1.5 5-9.3 9.6-9.3 9.6z"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
        />
    </svg>
);

export default HeartIcon;
