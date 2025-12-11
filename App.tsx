import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  Wand2, 
  Download, 
  Image as ImageIcon, 
  Type as TypeIcon,
  Palette,
  Sparkles,
  LayoutTemplate,
  RefreshCcw,
  Loader2
} from 'lucide-react';
import { Button } from './components/Button';
import { MemeCanvas } from './components/MemeCanvas';
import { MemeText, AppMode, Template } from './types';
import { generateMagicCaptions, editImageWithAI } from './services/geminiService';

// Initial Template Data
const TEMPLATES: Template[] = [
  { id: '1', name: 'Distracted Boyfriend', url: 'https://picsum.photos/id/1/800/600' }, // Using placeholder as requested, but realistically these would be real meme URLs
  { id: '2', name: 'Drake Hotline', url: 'https://picsum.photos/id/20/800/800' },
  { id: '3', name: 'Two Buttons', url: 'https://picsum.photos/id/30/800/600' },
  { id: '4', name: 'Change My Mind', url: 'https://picsum.photos/id/40/800/600' },
];

export default function App() {
  const [image, setImage] = useState<string>('https://picsum.photos/800/600');
  const [texts, setTexts] = useState<MemeText[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<AppMode>(AppMode.CAPTION);
  const [editPrompt, setEditPrompt] = useState('');
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // -- File Handling --
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (typeof ev.target?.result === 'string') {
          setImage(ev.target.result);
          setTexts([]); // Clear texts on new image
          setCaptions([]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // -- Text Management --
  const addText = (initialContent = 'DOUBLE TAP TO EDIT') => {
    const newText: MemeText = {
      id: Date.now().toString(),
      content: initialContent,
      x: 400, // Center-ish relative to container, updated on render usually but good enough default
      y: 300,
      fontSize: 40,
      color: '#FFFFFF'
    };
    setTexts(prev => [...prev, newText]);
    setSelectedTextId(newText.id);
  };

  const updateText = (id: string, updates: Partial<MemeText>) => {
    setTexts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const removeText = (id: string) => {
    setTexts(prev => prev.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  // -- AI Features --

  // 1. Magic Caption (Gemini 3 Pro)
  const handleMagicCaption = async () => {
    if (!image) return;
    setIsProcessing(true);
    setMode(AppMode.CAPTION);
    setCaptions([]);
    
    try {
      // We pass the raw image source. If it's a URL, we might need to fetch it to get base64.
      // Ideally, we keep `image` as base64 internally. 
      // For placeholder URLs, we fetch and convert first.
      let base64Image = image;
      if (image.startsWith('http')) {
         const resp = await fetch(image);
         const blob = await resp.blob();
         base64Image = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
         });
      }

      const suggestions = await generateMagicCaptions(base64Image);
      setCaptions(suggestions);
    } catch (error) {
      console.error(error);
      alert("Failed to generate captions. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. AI Edit (Gemini 2.5 Flash Image - "Nano banana")
  const handleAiEdit = async () => {
    if (!editPrompt.trim() || !image) return;
    setIsProcessing(true);

    try {
      let base64Image = image;
      if (image.startsWith('http')) {
         const resp = await fetch(image);
         const blob = await resp.blob();
         base64Image = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
         });
      }

      const newImageBase64 = await editImageWithAI(base64Image, editPrompt);
      if (newImageBase64) {
        setImage(newImageBase64);
        setEditPrompt('');
      } else {
        alert("AI could not edit the image this time.");
      }
    } catch (error) {
      console.error(error);
      alert("Error editing image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // -- Download --
  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    // Create a temporary canvas to draw everything
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const imgEl = canvasRef.current.querySelector('img');
    
    if (!ctx || !imgEl) return;

    // Wait for image to be fully loaded (it should be displayed already)
    canvas.width = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;

    // Draw Image
    ctx.drawImage(imgEl, 0, 0);

    // Draw Texts
    // We need to scale text coordinates because the displayed image might be scaled down
    const displayRect = imgEl.getBoundingClientRect();
    const scaleX = imgEl.naturalWidth / displayRect.width;
    const scaleY = imgEl.naturalHeight / displayRect.height;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    
    texts.forEach(text => {
      // Calculate position relative to the image element top-left
      // Text coordinates in state are relative to the Container (canvasRef)
      // We need to account for where the image is actually rendered within the container if using object-contain
      // For simplicity in this structure, we assumed the text is positioned relative to the container. 
      // Correcting coordinates:
      // 1. Get text offset from container
      // 2. Adjust for image offset within container (if any)
      // 3. Scale to natural size
      
      // Simplifying assumption for this demo: Image takes up known space or we use percent.
      // Let's rely on the fact that the text `x` and `y` are pixels relative to the DOM container overlaying the image.
      // However, to get a pixel-perfect export on different aspect ratios, relying on DOM element coordinates 
      // mapped to natural image coordinates requires math.
      
      // Robust Approach: Calculate relative position (%) then apply to natural size.
      // Note: text.x/y are currently absolute pixels in the DOM container.
      // We need to know the DOM container dimensions.
      // But wait, the `MemeCanvas` renders the image inside a relative container. 
      // The text is absolute positioned within that container.
      
      // Let's get the container bounds (which wraps the image tightly due to inline-block structure in MemeCanvas)
      const containerRect = canvasRef.current!.getBoundingClientRect();
      const relativeX = (text.x) / containerRect.width; // 0 to 1
      const relativeY = (text.y) / containerRect.height; // 0 to 1

      const drawX = relativeX * canvas.width;
      const drawY = relativeY * canvas.height;
      const fontSize = (text.fontSize / containerRect.width) * canvas.width;

      ctx.font = `900 ${fontSize}px "Anton", sans-serif`;
      
      // Stroke
      ctx.strokeStyle = 'black';
      ctx.lineWidth = fontSize * 0.1;
      ctx.strokeText(text.content, drawX, drawY);
      
      // Fill
      ctx.fillStyle = text.color;
      ctx.fillText(text.content, drawX, drawY);
    });

    const link = document.createElement('a');
    link.download = `meme-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gray-950 text-gray-100">
      
      {/* Sidebar - Controls */}
      <aside className="w-full md:w-80 bg-gray-900 border-r border-gray-800 flex flex-col z-20 shadow-xl overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-6 flex items-center gap-2">
            <Sparkles className="text-indigo-400" /> MemeGen AI
          </h1>

          <div className="space-y-6">
            {/* Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Source Image</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-gray-800 transition-colors">
                  <Upload className="w-6 h-6 mb-2 text-indigo-400" />
                  <span className="text-xs font-medium">Upload</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
                <button onClick={() => setImage(`https://picsum.photos/seed/${Date.now()}/800/600`)} className="flex flex-col items-center justify-center p-4 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors bg-gray-800/50">
                   <RefreshCcw className="w-6 h-6 mb-2 text-indigo-400" />
                   <span className="text-xs font-medium">Random</span>
                </button>
              </div>
            </div>

            {/* Templates */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <LayoutTemplate size={14} /> Templates
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TEMPLATES.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => setImage(t.url)}
                    className="aspect-square rounded-md overflow-hidden border border-gray-700 hover:border-indigo-500 transition-all opacity-80 hover:opacity-100"
                    title={t.name}
                  >
                    <img src={t.url} alt={t.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-gray-800" />

            {/* AI Tools */}
            <div className="space-y-4">
               <label className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Wand2 size={14} /> AI Magic
              </label>
              
              {/* Magic Caption Button */}
              <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl space-y-3">
                 <h3 className="text-sm font-semibold text-indigo-300">Magic Caption</h3>
                 <p className="text-xs text-gray-400">Analyze context & suggest humor.</p>
                 <Button 
                    onClick={handleMagicCaption} 
                    isLoading={isProcessing && mode === AppMode.CAPTION} 
                    className="w-full text-sm"
                    variant="primary"
                    icon={<Sparkles size={16} />}
                 >
                    Generate Captions
                 </Button>
              </div>

               {/* AI Edit Button (Nano Banana) */}
               <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl space-y-3">
                 <h3 className="text-sm font-semibold text-purple-300">AI Editor</h3>
                 <p className="text-xs text-gray-400">"Add sunglasses", "Make it retro"</p>
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. Add fire background"
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-2 py-1 text-sm focus:border-purple-500 outline-none"
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                    />
                 </div>
                 <Button 
                    onClick={handleAiEdit} 
                    isLoading={isProcessing && editPrompt !== ''} 
                    className="w-full text-sm bg-purple-600 hover:bg-purple-700 shadow-purple-900/50"
                    variant="primary"
                    icon={<Palette size={16} />}
                    disabled={!editPrompt.trim()}
                 >
                    Apply Edit
                 </Button>
              </div>
            </div>

          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Toolbar */}
        <header className="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
             <Button 
              variant="secondary" 
              onClick={() => addText()}
              icon={<TypeIcon size={16} />}
              className="text-sm"
            >
              Add Text
            </Button>
            <div className="h-6 w-px bg-gray-700"></div>
            {selectedTextId && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                 <span className="text-xs text-gray-400 uppercase font-bold">Edit Text:</span>
                 <input 
                    type="text" 
                    value={texts.find(t => t.id === selectedTextId)?.content || ''}
                    onChange={(e) => updateText(selectedTextId, { content: e.target.value })}
                    className="bg-gray-800 border-none rounded px-3 py-1 text-sm focus:ring-1 focus:ring-indigo-500 outline-none w-48"
                    autoFocus
                 />
                 <input 
                    type="color"
                    value={texts.find(t => t.id === selectedTextId)?.color || '#FFFFFF'}
                    onChange={(e) => updateText(selectedTextId, { color: e.target.value })} 
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                 />
              </div>
            )}
          </div>
          
          <Button variant="primary" onClick={handleDownload} icon={<Download size={16} />}>
            Export Meme
          </Button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative flex">
          
          {/* Canvas Wrapper */}
          <div className="flex-1 flex items-center justify-center p-8 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px]">
            <MemeCanvas 
              imageSrc={image}
              texts={texts}
              onUpdateText={updateText}
              onRemoveText={removeText}
              selectedTextId={selectedTextId}
              onSelectText={setSelectedTextId}
              canvasRef={canvasRef}
            />
          </div>

          {/* Suggestions Panel (Conditional) */}
          {(captions.length > 0 || isProcessing) && mode === AppMode.CAPTION && (
            <div className="w-72 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto animate-in slide-in-from-right absolute right-0 top-0 bottom-0 shadow-2xl z-20">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-indigo-400 flex items-center gap-2">
                    <Sparkles size={16} /> Suggestions
                  </h3>
                  <button onClick={() => setCaptions([])} className="text-gray-500 hover:text-white">&times;</button>
               </div>
               
               {isProcessing && (
                 <div className="flex flex-col items-center justify-center py-10 space-y-4 text-gray-500">
                    <Loader2 className="animate-spin w-8 h-8 text-indigo-500" />
                    <p className="text-sm">Thinking of funny things...</p>
                 </div>
               )}

               <div className="space-y-2">
                 {captions.map((caption, idx) => (
                   <button
                    key={idx}
                    onClick={() => {
                      addText(caption);
                      // Close panel on mobile if needed, or keep open to add more
                    }}
                    className="w-full text-left p-3 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500 transition-all text-sm leading-relaxed"
                   >
                     "{caption}"
                   </button>
                 ))}
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
