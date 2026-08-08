import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DownloadButton from './components/DownloadButton';

// 自定义 Markdown 组件映射，复刻原项目 A4 简历样式
const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-3xl font-bold mb-5">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="title text-xl font-bold my-8 border-l-4 p-4 border-black bg-gray-200 -mx-4">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-lg font-bold my-3">{children}</h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="font-semibold my-2">{children}</h4>
  ),
  h5: ({ children }: { children?: React.ReactNode }) => (
    <h5 className="font-semibold mb-1">{children}</h5>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-1 leading-7">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-6 my-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong>{children}</strong>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <table className="w-full my-2 border-collapse">{children}</table>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="hidden">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="flex justify-between">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="font-bold text-left py-1">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="py-1">{children}</td>
  ),
};

export default async function ResumePage() {
  // 读取 Markdown 文件（构建时 SSG 或请求时 ISR）
  const filePath = path.join(process.cwd(), 'content', 'resume.md');
  const raw = await fs.readFile(filePath, 'utf-8');
  const { data, content } = matter(raw);

  return (
    <div className="min-h-screen bg-[#eee] py-[2rem]">
      {/* 下载按钮 - 打印时隐藏 */}
      <div className="no-print fixed top-6 right-6 z-50">
        <DownloadButton />
      </div>

      {/* A4 简历容器 */}
      <article className="resume w-[21cm] min-h-[29.7cm] mx-auto bg-white px-[2em] py-[2rem] shadow-lg">
        {/* 头部区域：从 frontmatter 渲染 */}
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-5">{data.name}</h1>
            <p className="my-2 leading-7">
              {data.gender} | {data.age}岁
            </p>
            <p className="mb-2">
              {data.position} | {data.years}
            </p>
            <p>
              电话: <strong>{data.phone}</strong> 邮箱: <strong>{data.email}</strong>
            </p>
          </div>
          {/* 头像 */}
          {data.avatar && (
            <div
              className="w-[8rem] h-[10rem] bg-cover bg-[-53px] bg-no-repeat title shrink-0"
              style={{ backgroundImage: `url(${data.avatar})` }}
            />
          )}
        </header>

        {/* 正文：从 Markdown content 渲染 */}
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
