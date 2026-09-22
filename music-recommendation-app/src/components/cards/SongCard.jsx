import React from 'react';
import { Play } from 'lucide-react';

const SongCard = ({ title, subtitle }) => {
  return (
    <div className="flex-none w-40 p-4 bg-card rounded-md hover:bg-cardHover transition-colors group cursor-pointer">
      <div className="relative w-full aspect-square mb-4 rounded-md overflow-hidden bg-gray-800">
        {/* Placeholder for Image */}
        <div className="absolute inset-0 bg-gray-700"></div>
        
        {/* Play Button Overlay */}
        <div className="absolute bottom-2 right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-lg">
          <Play fill="white" size={18} className="ml-1 text-white" />
        </div>
      </div>
      <h3 className="text-white font-semibold text-sm truncate">{title}</h3>
      <p className="text-gray-400 text-xs truncate mt-1">{subtitle}</p>
    </div>
  );
};

export default SongCard;
