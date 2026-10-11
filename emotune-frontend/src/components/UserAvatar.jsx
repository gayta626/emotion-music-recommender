import './UserAvatar.scss';

// Avatar tài khoản (Figma 329:300 / 329:393): 2 chữ đầu tên đăng nhập trên nền gradient tím -> hồng.
// Chưa có ảnh đại diện trong DB nên chỉ dùng chữ.
const UserAvatar = ({ username = '', size = 40 }) => (
    <span className="user-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">
        {username.slice(0, 2).toUpperCase() || '?'}
    </span>
);

export default UserAvatar;
