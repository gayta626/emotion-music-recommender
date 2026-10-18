import './Skeleton.scss';

// I6: khung xam khi dang tai (skeleton) - dung hinh noi dung sap hien -> trang khong trong tron / nhay bo cuc khi du lieu ve.
// Chi de trang tri (aria-hidden); trinh doc man hinh nghe "Loading" qua khung bao ngoai role="status".

// the bai / ca si trong 1 hang Shelf (dung lai class .card cua BrowsePage -> cung co voi the that)
export const SkeletonCards = ({ count = 6, round = false }) => (
    Array.from({ length: count }, (_, i) => (
        <span key={i} className="card sk-card" aria-hidden="true">
            <span className={`card-art sk ${round ? 'round' : ''}`} />
            <span className="sk sk-line" />
            <span className="sk sk-line short" />
        </span>
    ))
)

// ca trang co dau trang (anh lon + ten) va danh sach bai: trang ca si, Mix, Playlist
export const SkeletonPage = ({ className = '', rows = 8, round = false }) => (
    <div className={`sk-page ${className}`} role="status" aria-label="Loading">
        <div className="sk-hero" aria-hidden="true">
            <span className={`sk sk-art ${round ? 'round' : ''}`} />
            <span className="sk-hero-text">
                <span className="sk sk-line short" />
                <span className="sk sk-title" />
                <span className="sk sk-line" />
            </span>
        </div>
        <SkeletonRows count={rows} />
    </div>
)

export const SkeletonRows = ({ count = 8 }) => (
    <div className="sk-rows" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
            <span key={i} className="sk-row">
                <span className="sk sk-thumb" />
                <span className="sk-row-text">
                    <span className="sk sk-line" style={{ width: `${45 + ((i * 37) % 35)}%` }} />
                    <span className="sk sk-line short" />
                </span>
            </span>
        ))}
    </div>
)

// luoi the lon (trang thong ke /stats)
export const SkeletonPanels = ({ count = 4 }) => (
    <div className="sk-panels" role="status" aria-label="Loading">
        {Array.from({ length: count }, (_, i) => <span key={i} className="sk sk-panel" aria-hidden="true" />)}
    </div>
)
