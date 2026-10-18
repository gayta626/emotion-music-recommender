import { useEffect, useId, useRef } from 'react';

// Hộp thoại dùng chung của trang admin (xác nhận xoá, mật khẩu tạm, form bài hát / ca sĩ).
// Dùng <dialog> gốc của trình duyệt: showModal() tự giữ focus bên trong, Esc để đóng, nền phía sau không bấm được.
const AdminDialog = ({ title, onClose, children, wide = false }) => {
    const ref = useRef(null);
    const titleId = useId();   // id riêng mỗi hộp thoại: có lúc 2 hộp thoại chồng nhau (Manage -> Delete)

    useEffect(() => {
        const el = ref.current;
        if (el && !el.open) el.showModal();
        return () => { if (el?.open) el.close(); };
    }, []);

    return (
        <dialog
            ref={ref}
            className={`admin-dialog ${wide ? 'wide' : ''}`}
            aria-labelledby={titleId}
            onCancel={(e) => { e.preventDefault(); onClose(); }}
            onClick={(e) => { if (e.target === ref.current) onClose(); }}   // bấm ra nền mờ = đóng
        >
            <div className="ad-head">
                <h2 id={titleId}>{title}</h2>
                <button className="ad-close" onClick={onClose} aria-label="Close">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
            </div>
            {children}
        </dialog>
    );
};

export default AdminDialog;
