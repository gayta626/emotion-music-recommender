import React from 'react';
import { Home, Compass, Radio, Library, Music, ListMusic, Download } from 'lucide-react';

const Sidebar = () => {
  return (
    <aside className="w-64 h-full bg-black flex flex-col hidden md:flex border-r border-gray-800">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>NYX</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-8 overflow-y-auto">
        <div>
          <h2 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Khám phá</h2>
          <ul className="space-y-2">
            <li>
              <a href="#" className="flex items-center gap-3 px-2 py-2 text-purple-500 font-medium bg-gray-900 rounded-md">
                <Home size={20} />
                <span>Trang chủ</span>
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center gap-3 px-2 py-2 text-gray-400 hover:text-white transition-colors">
                <Compass size={20} />
                <span>Khám phá</span>
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center gap-3 px-2 py-2 text-gray-400 hover:text-white transition-colors">
                <Radio size={20} />
                <span>Radio</span>
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Thư viện</h2>
          <ul className="space-y-2">
            <li>
              <a href="#" className="flex items-center gap-3 px-2 py-2 text-gray-400 hover:text-white transition-colors">
                <Library size={20} />
                <span>Playlist</span>
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center gap-3 px-2 py-2 text-gray-400 hover:text-white transition-colors">
                <Music size={20} />
                <span>Bài hát</span>
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center gap-3 px-2 py-2 text-gray-400 hover:text-white transition-colors">
                <ListMusic size={20} />
                <span>Album</span>
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center gap-3 px-2 py-2 text-gray-400 hover:text-white transition-colors">
                <Download size={20} />
                <span>Tải xuống</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
