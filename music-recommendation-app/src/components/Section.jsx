import React from 'react';

const Section = ({ title, children, showMore = true }) => {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 group cursor-pointer">
          {title}
          {showMore && (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
              →
            </span>
          )}
        </h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {children}
      </div>
    </section>
  );
};

export default Section;
