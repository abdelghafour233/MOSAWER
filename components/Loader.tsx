import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative w-16 h-16">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-brand-500/30 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
      <p className="text-brand-100 animate-pulse font-medium">جاري معالجة الصورة...</p>
    </div>
  );
};

export default Loader;