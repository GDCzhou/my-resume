import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Toolbar from './components/Toolbar';
import AcidBackground from './components/AcidBackground';

// 字体层级：h1=20px > h2=16px > h3=14px > h4=13px > p/li=12px
// ✅ 所有文字使用浅色，确保在深色星空背景上清晰可读
const markdownComponents = {
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="title text-base font-bold my-3 border-l-4 py-1 pl-3 pr-0 border-cyan-400/50 bg-white/[0.08] text-white/95 rounded-r">
      {children}
    </h2>
  ),

  h3: ({ children }: { children?: React.ReactNode }) => {
    const childArray = Array.isArray(children) ? children : [children];
    let companyName = '';
    let position = '';
    let time = '';

    childArray.forEach((child, idx) => {
      if (typeof child === 'string') {
        if (idx === 0) {
          companyName = child.trim();
        } else if (child.includes('|')) {
          position = child.split('|')[1]?.trim() || '';
        }
      } else if (child && typeof child === 'object' && 'props' in child) {
        const el = child as { props?: { children?: React.ReactNode } };
        if (el.props?.children) {
          time = String(el.props.children);
        }
      }
    });

    return (
      <h3 className="text-sm font-bold my-1.5 flex justify-between items-baseline gap-4 text-white/90">
        <span>{companyName}</span>
        <span className="font-normal text-sm text-white/75">{position}</span>
        <span className="font-normal text-sm whitespace-nowrap shrink-0 text-white/65">{time}</span>
      </h3>
    );
  },

  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-[13px] font-semibold my-0.5 text-white/85">{children}</h4>
  ),
  h5: ({ children }: { children?: React.ReactNode }) => (
    <h5 className="text-[13px] font-semibold mb-0.5 text-white/85">{children}</h5>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-xs leading-relaxed my-0.5 text-white/80">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-5 my-0.5 space-y-0 text-xs text-white/80">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-5 my-0.5 space-y-0 text-xs text-white/80">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed text-xs text-white/80">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="text-white/95">{children}</strong>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-200 underline">{children}</a>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <table className="w-full my-0.5 text-xs text-white/80">{children}</table>
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
    <th className="font-bold text-left py-0.5 text-white/90">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="py-0.5 text-white/75">{children}</td>
  ),
};

// ===== 简历配置 =====
export const RESUME_LIST = [
  { type: 'frontend', label: '前端工程师', file: 'resume.md' },
  { type: 'fullstack', label: '全栈开发工程师', file: 'resume-fullstack.md' },
];

export default async function ResumePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const resumeType = RESUME_LIST.find(r => r.type === params.type)?.type || RESUME_LIST[0].type;
  const fileName = RESUME_LIST.find(r => r.type === resumeType)?.file || RESUME_LIST[0].file;

  const filePath = path.join(process.cwd(), 'content', fileName);
  const raw = await fs.readFile(filePath, 'utf-8');
  const { data, content } = matter(raw);

  const hasAvatar = !!data.avatar;

  return (
    <div className="min-h-screen relative py-[2rem]">
      {/* 酷炫背景动画 — Galaxy 星空（深色不透明背景） */}
      <AcidBackground />

      {/* 统一工具栏 */}
      <Toolbar currentType={resumeType} />

      {/* A4 纸容器 — 毛玻璃立体效果 + 微妙边框让轮廓清晰可见 */}
      <article
        className={`resume relative z-10 w-[21cm] min-h-[29.7cm] mx-auto
                   bg-white/[0.05] backdrop-blur-xl 
                   border border-white/[0.12] rounded-lg
                   shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.08)_inset]
                   ${hasAvatar ? 'px-[2em] pt-[1.2rem] pb-[1.5rem]' : 'px-[3em] pt-[1.5rem] pb-[1.5rem]'}`}
      >

        {/* Header */}
        <header className={`${hasAvatar ? 'flex justify-between items-start mb-2' : 'text-center mb-2'}`}>
          <div className={hasAvatar ? 'flex-1' : ''}>
            <h1 className={`${hasAvatar ? 'text-xl' : 'text-2xl'} font-bold leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]`}>
              {data.name}
            </h1>

            <div className={`mt-1.5 ${hasAvatar ? 'text-xs leading-[1.6]' : 'text-sm leading-[1.6]'} text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]`}>
              {hasAvatar ? (
                <>
                  <p>{data.gender} | {data.age}岁</p>
                  <p>{data.position} | {data.years}</p>
                  <p>电话：<strong className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{data.phone}</strong> 邮箱：<strong className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{data.email}</strong></p>
                </>
              ) : (
                <>
                  <p>{data.gender} | {data.age}岁 | {data.position} | {data.years}</p>
                  <p className="mt-0.5"><strong className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{data.phone}</strong> | <strong className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{data.email}</strong></p>
                </>
              )}
            </div>
          </div>

          {hasAvatar && (
            <div
              className="w-[95px] h-[120px] bg-cover bg-center bg-no-repeat title shrink-0 ml-4 rounded shadow-md ring-1 ring-white/10"
              style={{ backgroundImage: `url(${data.avatar})` }}
            />
          )}
        </header>

        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
