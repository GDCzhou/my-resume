'use client';
import { useState } from 'react';

// ===== 简历配置 =====
const RESUME_LIST = [
  { type: 'frontend', label: '前端工程师', file: 'resume.md' },
  { type: 'fullstack', label: '全栈开发工程师', file: 'resume-fullstack.md' },
];

// Icon 工具栏 — 悬停触发 + 精美下拉菜单
export default function Toolbar({ currentType }: { currentType: string }) {
  const [showMenu, setShowMenu] = useState(false);
  const currentLabel = RESUME_LIST.find(r => r.type === currentType)?.label || RESUME_LIST[0].label;

  return (
    <div className="no-print fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
      {/* 切换简历 — 悬停触发 */}
      <div
        className="relative"
        onMouseEnter={() => setShowMenu(true)}
        onMouseLeave={() => setShowMenu(false)}
      >
        {/* 图标按钮 */}
        <button
          className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-md border border-gray-200 
                     hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 group"
          title={`当前：${currentLabel}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" 
               className={`w-5 h-5 transition-colors duration-200 ${showMenu ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'}`} 
               fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>

        {/* 下拉菜单 — 精美样式 */}
        {showMenu && (
          <div className="absolute right-0 top-12 w-52 z-50">
            {/* 菜单容器 */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
              {/* 菜单头部 */}
              <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">选择简历</span>
              </div>

              {/* 菜单项 */}
              <div className="py-1.5">
                {RESUME_LIST.map((resume) => {
                  const isActive = resume.type === currentType;
                  return (
                    <a
                      key={resume.type}
                      href={`/?type=${resume.type}`}
                      className={`
                        flex items-center gap-3 px-4 py-2.5 mx-1.5 rounded-lg
                        transition-all duration-150 cursor-pointer
                        ${isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      {/* 左侧图标 */}
                      <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                        transition-colors duration-150
                        ${isActive
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-400'
                        }
                      `}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>

                      {/* 文字 + 对勾 */}
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13px] font-medium truncate ${isActive ? 'text-blue-700' : ''}`}>
                          {resume.label}
                        </div>
                        {!isActive && (
                          <div className="text-[10px] text-gray-400 mt-0.5">点击切换</div>
                        )}
                      </div>

                      {/* 当前选中标记 */}
                      {isActive && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </a>
                  );
                })}
              </div>

              {/* 底部装饰线 */}
              <div className="h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent" />
            </div>

            {/* 小三角箭头 */}
            <div className="absolute -top-2 right-4 w-4 h-4 bg-white/95 backdrop-blur-sm border-l border-t border-gray-100 rotate-45 shadow-sm" />
          </div>
        )}
      </div>

      {/* 下载 PDF — 图标按钮 */}
      <button
        onClick={() => window.print()}
        className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-md border border-gray-200 
                   hover:bg-green-50 hover:border-green-400 active:scale-95 transition-all duration-200"
        title="下载 PDF"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>
    </div>
  );
}
