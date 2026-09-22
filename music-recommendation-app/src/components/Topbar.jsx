import React from 'react';
import { Search, Bell, Globe } from 'lucide-react';

const Topbar = () => {
  return (
    <header className="h-16 px-6 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-md z-10 border-b border-gray-800">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm bài hát, nghệ sĩ, lời bài hát..." 
            className="w-full bg-gray-900 border border-gray-800 text-white text-sm rounded-full pl-10 pr-4 py-2 focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition-all"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4 ml-4">
        <button className="text-gray-400 hover:text-white">
          <Globe size={20} />
        </button>
        <button className="text-gray-400 hover:text-white">
          <Bell size={20} />
        </button>
        <button className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors">
          Đăng ký
        </button>
        <button className="bg-white text-black text-sm font-medium px-4 py-2 rounded-full hover:bg-gray-200 transition-colors">
          Đăng nhập
        </button>
      </div>
    </header>
  );
};

export default Topbar;
