import React from 'react';

const Footer = () => {
  return (
    <footer className="mt-12 mb-20 border-t border-gray-800 pt-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <h4 className="text-white font-bold mb-4">Công ty</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="#" className="hover:text-white transition-colors">Giới thiệu</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Việc làm</a></li>
            <li><a href="#" className="hover:text-white transition-colors">For the Record</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4">Cộng đồng</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="#" className="hover:text-white transition-colors">Dành cho Nghệ sĩ</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Nhà phát triển</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Quảng cáo</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Nhà đầu tư</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Nhà cung cấp</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4">Liên kết hữu ích</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="#" className="hover:text-white transition-colors">Hỗ trợ</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Ứng dụng Di động</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4">Các gói của NYX</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="#" className="hover:text-white transition-colors">Premium Individual</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Premium Duo</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Premium Family</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Premium Student</a></li>
            <li><a href="#" className="hover:text-white transition-colors">NYX Free</a></li>
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-between mt-8 pt-8 border-t border-gray-800 text-xs text-gray-400">
        <div className="flex gap-4">
          <a href="#" className="hover:text-white transition-colors">Pháp lý</a>
          <a href="#" className="hover:text-white transition-colors">Trung tâm an toàn và quyền riêng tư</a>
          <a href="#" className="hover:text-white transition-colors">Chính sách quyền riêng tư</a>
          <a href="#" className="hover:text-white transition-colors">Cookie</a>
          <a href="#" className="hover:text-white transition-colors">Giới thiệu quảng cáo</a>
        </div>
        <div>
          © 2026 NYX AB
        </div>
      </div>
    </footer>
  );
};

export default Footer;
