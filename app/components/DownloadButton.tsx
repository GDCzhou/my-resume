'use client';

import { useState } from 'react';

export default function DownloadButton() {
  const [isPrinting, setIsPrinting] = useState(false);

  async function handleDownload() {
    setIsPrinting(true);
    // 短暂延迟确保 UI 更新后再触发打印
    await new Promise((resolve) => setTimeout(resolve, 100));
    window.print();
    // 打印对话框关闭后重置状态
    setTimeout(() => setIsPrinting(false), 500);
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isPrinting}
      className="
        no-print
        px-5 py-2.5 rounded-lg
        bg-black text-white text-sm font-medium
        hover:bg-gray-800 active:bg-gray-900
        transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        cursor-pointer
        shadow-md
      "
    >
      {isPrinting ? '准备中...' : '⬇ 下载 PDF 简历'}
    </button>
  );
}
