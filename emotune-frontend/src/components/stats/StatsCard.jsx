import { useState } from 'react';
import { EMOTIONS } from './statsMeta';

// Khung 1 mục: tiêu đề + nút "View as table" (khi có bảng) + ghi chú
const StatsCard = ({ title, note, table, className = '', children }) => {
    const [showTable, setShowTable] = useState(false);
    return (
        <section className={`stats-card ${className}`}>
            <div className="chart-top">
                <h3>{title}</h3>
                {table && (
                    <button className="table-toggle" onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
                        {showTable ? 'Show chart' : 'View as table'}
                    </button>
                )}
            </div>
            {note && <p className="stats-note">{note}</p>}
            {showTable && table ? <div className="mood-table-wrap">{table}</div> : children}
        </section>
    );
};

// chú giải màu 5 cảm xúc (luôn có chữ, không chỉ dựa vào màu)
export const MoodLegend = () => (
    <ul className="chart-legend" aria-label="Legend">
        {EMOTIONS.map((e) => (
            <li key={e.key}><span className={`swatch ${e.key}`} aria-hidden="true" />{e.label}</li>
        ))}
    </ul>
);

export default StatsCard;
