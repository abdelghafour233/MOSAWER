import React, { useState, useRef, useCallback } from 'react';
import { AppStatus, FileData } from './types';
import { transformImage } from './services/geminiService';
import { fileToBase64, downloadImage } from './utils';
import { UploadIcon, WandIcon, DownloadIcon, RefreshIcon, TrashIcon } from './components/Icons';
import Loader from './components/Loader';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [originalImage, setOriginalImage] = useState<FileData | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("يرجى تحميل ملف صورة صالح.");
      return;
    }

    try {
      setStatus(AppStatus.UPLOADING);
      const previewUrl = URL.createObjectURL(file);
      const base64 = await fileToBase64(file);
      
      setOriginalImage({
        file,
        previewUrl,
        base64,
        mimeType: file.type
      });
      setGeneratedImageUrl(null);
      setError(null);
      setStatus(AppStatus.IDLE);
    } catch (e) {
      setError("فشل في معالجة الصورة.");
      setStatus(AppStatus.IDLE);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleGenerate = async () => {
    if (!originalImage || !prompt.trim()) return;

    setStatus(AppStatus.GENERATING);
    setError(null);

    try {
      const resultUrl = await transformImage(
        originalImage.base64,
        originalImage.mimeType,
        prompt
      );
      setGeneratedImageUrl(resultUrl);
      setStatus(AppStatus.SUCCESS);
    } catch (e: any) {
      setError(e.message || "حدث خطأ ما أثناء التوليد.");
      setStatus(AppStatus.ERROR);
    }
  };

  const resetAll = () => {
    setOriginalImage(null);
    setGeneratedImageUrl(null);
    setPrompt("");
    setStatus(AppStatus.IDLE);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-6 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-500 p-2 rounded-lg">
              <WandIcon className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-brand-500 to-purple-500">
              محرر الصور الذكي
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <a 
                href="https://github.com" 
                target="_blank" 
                rel="noreferrer"
                className="text-slate-400 hover:text-white transition-colors text-sm font-medium hidden sm:block"
            >
                بدعم من Gemini
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 sm:p-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          
          {/* Left Column: Input */}
          <div className="flex flex-col space-y-6">
            
            {/* Upload Area */}
            <div 
              className={`
                relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[300px] bg-slate-800/50
                ${!originalImage ? 'border-slate-600 hover:border-brand-500 hover:bg-slate-800' : 'border-brand-500 bg-slate-900'}
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                disabled={status === AppStatus.GENERATING}
              />
              
              {!originalImage ? (
                <div className="flex flex-col items-center space-y-4 pointer-events-none z-10">
                  <div className="bg-slate-700 p-4 rounded-full">
                    <UploadIcon className="w-8 h-8 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-slate-200">أفلت الصورة هنا</p>
                    <p className="text-sm text-slate-400 mt-1">أو انقر لاختيار ملف</p>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex flex-col items-center justify-center z-10">
                  <img 
                    src={originalImage.previewUrl} 
                    alt="Original" 
                    className="max-h-[400px] max-w-full rounded-lg shadow-xl object-contain" 
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        resetAll();
                      }}
                      className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-sm transition-all shadow-lg z-30"
                      title="حذف الصورة"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Controls */}
            <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
              <label htmlFor="prompt" className="block text-sm font-medium text-slate-300 mb-2">
                كيف تريد تعديل هذه الصورة؟
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="prompt"
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="مثال: غيّر الخلفية إلى مدينة مستقبلية، اجعلها تبدو كرسم..."
                  className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                  disabled={status === AppStatus.GENERATING || !originalImage}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <button
                  onClick={handleGenerate}
                  disabled={status === AppStatus.GENERATING || !originalImage || !prompt.trim()}
                  className={`
                    px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all min-w-[140px]
                    ${status === AppStatus.GENERATING || !originalImage || !prompt.trim()
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/50 hover:shadow-brand-500/25'
                    }
                  `}
                >
                  {status === AppStatus.GENERATING ? (
                    <span>جارٍ التوليد...</span>
                  ) : (
                    <>
                      <WandIcon className="w-5 h-5" />
                      <span>تحويل</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                تلميح: كن دقيقاً في وصف التغييرات التي تريدها للحصول على أفضل نتيجة.
              </p>
            </div>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* Right Column: Output */}
          <div className="flex flex-col h-full min-h-[400px]">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 h-full p-6 relative overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-semibold text-slate-200">النتيجة</h2>
                 {generatedImageUrl && (
                   <div className="flex gap-2">
                      <button 
                        onClick={() => handleGenerate()}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                        title="إعادة التوليد"
                      >
                        <RefreshIcon className="w-5 h-5" />
                      </button>
                   </div>
                 )}
              </div>
              
              <div className="flex-grow flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-700/50 relative overflow-hidden group">
                {status === AppStatus.GENERATING ? (
                  <Loader />
                ) : generatedImageUrl ? (
                  <>
                    <img 
                      src={generatedImageUrl} 
                      alt="Generated" 
                      className="max-h-[600px] w-full h-full object-contain rounded-lg"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-slate-900/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-center pb-8">
                       <button
                        onClick={() => downloadImage(generatedImageUrl, `transformed-${Date.now()}.png`)}
                        className="bg-white text-slate-900 px-6 py-2.5 rounded-full font-bold shadow-lg flex items-center gap-2 hover:bg-slate-100 transition-transform hover:scale-105 active:scale-95"
                      >
                        <DownloadIcon className="w-5 h-5" />
                        <span>تحميل الصورة</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-8">
                    <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center opacity-50">
                      <WandIcon className="w-10 h-10 text-slate-500" />
                    </div>
                    <p className="text-slate-400 font-medium">ستظهر تحفتك الفنية هنا</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </main>

      <footer className="p-6 text-center text-slate-500 text-sm">
        <p>محرر الصور الذكي &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default App;