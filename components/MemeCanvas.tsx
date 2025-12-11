import React, { useRef, useEffect, useState } from 'react';
import { MemeText } from '../types';
import { Move, Trash2, Type as TypeIcon } from 'lucide-react';

interface MemeCanvasProps {
  imageSrc: string;
  texts: MemeText[];
  onUpdateText: (id: string, newText: Partial<MemeText>) => void;
  onRemoveText: (id: string) => void;
  selectedTextId: string | null;
  onSelectText: (id: string | null) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

export const MemeCanvas: React.FC<MemeCanvasProps> = ({
  imageSrc,
  texts,
  onUpdateText,
  onRemoveText,
  selectedTextId,
  onSelectText,
  canvasRef
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onSelectText(id);
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedTextId || !dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const text = texts.find(t => t.id === selectedTextId);
    if (text) {
      onUpdateText(selectedTextId, {
        x: text.x + dx,
        y: text.y + dy
      });
    }

    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  return (
    <div 
      className="relative w-full h-full bg-gray-950 rounded-xl overflow-hidden shadow-2xl border border-gray-800 flex items-center justify-center select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => onSelectText(null)}
    >
      <div 
        ref={canvasRef}
        className="relative inline-block max-w-full max-h-full"
      >
        {/* Main Image */}
        <img 
          src={imageSrc} 
          alt="Meme Base" 
          className="max-w-full max-h-[70vh] object-contain block"
          draggable={false}
        />

        {/* Text Layers */}
        {texts.map((text) => (
          <div
            key={text.id}
            className={`absolute cursor-move group hover:scale-[1.01] transition-transform`}
            style={{
              left: text.x,
              top: text.y,
              transform: 'translate(-50%, -50%)', // Center anchor
            }}
            onMouseDown={(e) => handleMouseDown(e, text.id)}
          >
            <div 
              className={`
                meme-text text-center px-4 py-2 border-2 border-transparent rounded
                ${selectedTextId === text.id ? 'border-dashed border-indigo-500 bg-black/20' : 'hover:border-white/30'}
              `}
              style={{ fontSize: `${text.fontSize}px`, color: text.color }}
            >
              {text.content}
            </div>
            
            {/* Controls only visible when selected */}
            {selectedTextId === text.id && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-1 bg-gray-800 rounded-lg p-1 shadow-lg z-10">
                 <button 
                  className="p-1 hover:bg-gray-700 rounded text-red-400"
                  onClick={(e) => { e.stopPropagation(); onRemoveText(text.id); }}
                >
                  <Trash2 size={16} />
                </button>
                <div className="w-px bg-gray-700 mx-1" />
                 <button 
                  className="p-1 hover:bg-gray-700 rounded text-gray-300"
                  onMouseDown={(e) => {
                     // Increase font size
                     e.stopPropagation();
                     onUpdateText(text.id, { fontSize: Math.min(120, text.fontSize + 4) });
                  }}
                >
                  A+
                </button>
                <button 
                  className="p-1 hover:bg-gray-700 rounded text-gray-300"
                  onMouseDown={(e) => {
                     // Decrease font size
                     e.stopPropagation();
                     onUpdateText(text.id, { fontSize: Math.max(12, text.fontSize - 4) });
                  }}
                >
                  A-
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {texts.length === 0 && (
         <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-xs pointer-events-none backdrop-blur-sm">
           Tip: Click "Add Text" or use Magic Caption
         </div>
      )}
    </div>
  );
};
