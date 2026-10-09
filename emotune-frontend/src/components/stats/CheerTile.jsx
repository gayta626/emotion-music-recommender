// Ô Cheer-up mode (trạng thái từ /mood-history qua cheerUpStatus, như trang cũ).
// Tách riêng để trang vẫn hiện ô này khi /stats lỗi nhưng /mood-history được (spec §6).
const CheerTile = ({ cheer }) => (
    <div className={`mood-tile status ${cheer?.on ? 'on' : ''}`}>
        <span className="tile-label">Cheer-up mode</span>
        <span className="tile-value">{cheer ? (cheer.on ? 'On' : 'Off') : '—'}</span>
        {cheer && (
            <span className="tile-note">
                {cheer.on
                    ? `${cheer.negative} of ${cheer.total} scans ${cheer.span} were sad or angry, so when you feel down NYX plays happier songs.`
                    : cheer.total < 4
                        ? `NYX needs at least 4 scans to see a trend (${cheer.total} ${cheer.span}).`
                        : `Only ${cheer.negative} of ${cheer.total} scans ${cheer.span} were sad or angry. NYX follows your mood as it is.`}
            </span>
        )}
    </div>
);

export default CheerTile;
