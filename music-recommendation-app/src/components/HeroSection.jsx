import React from 'react';
import { Play } from 'lucide-react';

const HeroSection = () => {
  return (
    <div className="relative w-full h-[300px] rounded-xl overflow-hidden mb-10 group">
      {/* Background Gradient / Image Placeholder */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary to-[#2a0e45] opacity-90"></div>
      
      {/* Content */}
      <div className="absolute inset-0 p-8 flex flex-col justify-end">
        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Gợi ý hôm nay</p>
        <h1 className="text-5xl font-bold text-white mb-2">Midnight Drive</h1>
        <p className="text-gray-300 text-sm mb-6 max-w-md line-clamp-2">
          Giai điệu lofi cực chill, đồng hành cùng bạn trên những chuyến xe đêm tĩnh lặng.
        </p>
        
        <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform">
          <Play fill="currentColor" size={20} className="ml-1" />
        </button>
      </div>
    </div>
  );
};

export default HeroSection;
