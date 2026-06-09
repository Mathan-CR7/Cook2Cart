import { useState, useRef, useEffect } from 'react';
import { downloadAsTxt, downloadAsPdf } from '../utils/downloadRecipe';

/**
 * A reusable download button that shows a dropdown for TXT / PDF.
 * Props:
 *   recipe  - { title, ingredients, instructions }
 *   size    - 'sm' | 'md' (default 'md')
 */
export default function DownloadButton({ recipe, size = 'md' }) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(null); // 'txt' | 'pdf'
  const ref = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handle = async (type) => {
    setOpen(false);
    setDownloading(type);
    try {
      if (type === 'txt') downloadAsTxt(recipe);
      else downloadAsPdf(recipe);
    } finally {
      setTimeout(() => setDownloading(null), 1500);
    }
  };

  const isSmall = size === 'sm';

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Download recipe"
        className={`flex items-center gap-1.5 font-bold border transition-all rounded-xl
          ${isSmall
            ? 'px-2.5 py-1.5 text-xs'
            : 'px-3 py-2 text-sm'}
          ${downloading
            ? 'bg-orange-500 text-white border-orange-500'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300'
          }`}
      >
        {downloading ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {!isSmall && <span>Preparing…</span>}
          </>
        ) : (
          <>
            <svg className={`${isSmall ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {!isSmall && <span>Download</span>}
            <svg className={`${isSmall ? 'w-2.5 h-2.5' : 'w-3 h-3'} transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <button
            onClick={() => handle('txt')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
          >
            {/* TXT icon */}
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="text-left">
              <div className="font-semibold text-xs">Download TXT</div>
              <div className="text-[10px] text-gray-400">Plain text file</div>
            </div>
          </button>

          <div className="h-px bg-gray-100 mx-3" />

          <button
            onClick={() => handle('pdf')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
          >
            {/* PDF icon */}
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="text-left">
              <div className="font-semibold text-xs">Download PDF</div>
              <div className="text-[10px] text-gray-400">Print or save as PDF</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
