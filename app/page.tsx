import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DownloadButton from './components/DownloadButton';

// ============================================================
// 字体层级设计（从大到小，严格递减）
// h1=20px > h2=16px > h3=14px > h4=13px > p/li=12px
// ============================================================
const markdownComponents = {
  // ---- h2：章节标题（掌握技能/工作经历/项目经验/教育经历）
  //      16px 加粗 + 左边框灰底，作为页面第二级视觉锚点
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="title text-base font-bold my-5 border-l-4 py-1.5 pl-3 pr-0 border-black bg-gray-200">
      {children}
    </h2>
  ),

  // ---- h3：工作经历标题 / 项目名称
  //      14px 加粗，左中右三列（公司 | 职位 | 时间）
  //      比 h2 小一级，比正文大一级 ✓
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
      <h3 className="text-sm font-bold my-2.5 flex justify-between items-baseline gap-4">
        <span>{companyName}</span>
        <span className="font-normal text-sm">{position}</span>
        <span className="font-normal text-sm whitespace-nowrap shrink-0">{time}</span>
      </h3>
    );
  },

  // ---- h4：子标题（项目简介、技术栈、技术亮点）
  //      13px 半粗体，比正文略大以示区分
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-[13px] font-semibold my-1">{children}</h4>
  ),

  // ---- h5：更细分的子标签（如"技术亮点:"前缀）
  //      13px 半粗体，和 h4 同级
  h5: ({ children }: { children?: React.ReactNode }) => (
    <h5 className="text-[13px] font-semibold mb-0.5">{children}</h5>
  ),

  // ---- p：正文段落
  //      12px，基准正文字号
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-xs leading-relaxed my-1">{children}</p>
  ),

  // ---- ul/ol：列表容器
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-5 my-1 space-y-0.5 text-xs">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-5 my-1 space-y-0.5 text-xs">{children}</ol>
  ),

  // ---- li：列表项
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed text-xs">{children}</li>
  ),

  // ---- strong：行内加粗（继承父级字号）
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong>{children}</strong>
  ),

  // ---- a：链接
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  ),

  // ---- table：教育经历表格
  table: ({ children }: { children?: React.ReactNode }) => (
    <table className="w-full my-1 text-xs">{children}</table>
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
    <th className="font-bold text-left py-0.5">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="py-0.5">{children}</td>
  ),
};

export default async function ResumePage() {
  const filePath = path.join(process.cwd(), 'content', 'resume.md');
  const raw = await fs.readFile(filePath, 'utf-8');
  const { data, content } = matter(raw);

  return (
    <div className="min-h-screen bg-[#eee] py-[2rem]">
      <div className="no-print fixed top-6 right-6 z-50">
        <DownloadButton />
      </div>

      <article className="resume w-[21cm] min-h-[29.7cm] mx-auto bg-white px-[2em] py-[2rem] shadow-lg">
        {/* ===== 头部 ===== */}
        <header className="flex justify-between items-start">
          <div>
            {/* h1：姓名 — 20px，全页最大 */}
            <h1 className="text-xl font-bold mb-3">{data.name}</h1>
            {/* 头部信息 — 14px */}
            <p className="text-sm my-0.5">
              {data.gender} | {data.age}岁
            </p>
            <p className="text-sm my-0.5">
              {data.position} | {data.years}
            </p>
            <p className="text-sm my-0.5">
              电话：<strong>{data.phone}</strong> 邮箱：<strong>{data.email}</strong>
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

        {/* ===== 正文 ===== */}
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
