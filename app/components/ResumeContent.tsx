import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getResumeByType, getResumeContent } from '../lib/resumes';

// 辅助：判断是否为技能段落（格式：**类别**：技能1、技能2...）
function isSkillParagraph(children: React.ReactNode): { isSkill: boolean; label: string; skills: string[] } {
  const childArray = Array.isArray(children) ? children : [children];
  let label = '';
  let skillText = '';
  let foundStrong = false;

  for (const child of childArray) {
    if (child && typeof child === 'object' && 'props' in child) {
      const el = child as { props?: { children?: React.ReactNode }; type?: string };
      if (el.type === 'strong' && el.props?.children) {
        label = String(el.props.children);
        foundStrong = true;
        continue;
      }
    }
    if (typeof child === 'string' && foundStrong) {
      skillText = child.replace(/^[：:]\s*/, '');
      break;
    }
  }

  if (foundStrong && skillText.length > 0) {
    const skills = skillText
      .split(/[、,，]/)
      .map(s => s.trim())
      .filter(Boolean);
    if (skills.length >= 3) {
      return { isSkill: true, label, skills };
    }
  }
  return { isSkill: false, label: '', skills: [] };
}

export const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-[22px] font-bold tracking-wide text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    // 优化：板块间距加大，增加呼吸感
    <h2 className="title text-[14px] font-bold tracking-wide mt-6 mb-3 border-l-4 py-1.5 pl-3 pr-0 border-cyan-400/50 bg-white/[0.08] text-white/95 rounded-r first:mt-2">
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
      // 优化：公司名间距加大
      <h3 className="text-[13px] font-bold mt-4 mb-2 flex justify-between items-baseline gap-4 text-white/90 print:break-after-avoid">
        <span className="shrink-0 leading-snug">{companyName}</span>
        <span className="font-medium text-[12px] text-white/75 leading-snug">{position}</span>
        <span className="font-normal text-[11px] whitespace-nowrap shrink-0 text-white/60 leading-snug">{time}</span>
      </h3>
    );
  },
  h4: ({ children }: { children?: React.ReactNode }) => (
    // 优化：子标题间距加大
    <h4 className="text-[12.5px] font-semibold tracking-wide mt-3 mb-2 text-white/85 print:break-after-avoid">
      {children}
    </h4>
  ),
  h5: ({ children }: { children?: React.ReactNode }) => (
    <h5 className="text-[11.5px] font-semibold mb-1.5 text-white/85">{children}</h5>
  ),
  p: ({ children }: { children?: React.ReactNode }) => {
    const { isSkill, label, skills } = isSkillParagraph(children);
    if (isSkill) {
      return (
        // 优化：技能行间距加大
        <div className="flex items-start gap-3 my-1.5 leading-relaxed">
          <span className="text-[11px] font-semibold shrink-0 w-[72px] text-cyan-300/90 pt-1">{label}</span>
          <div className="flex flex-wrap gap-1.5 flex-1 items-center">
            {skills.map((skill, i) => (
              <span
                key={i}
                className="inline-flex items-center text-[10.5px] px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/15 text-white/80 whitespace-nowrap leading-snug"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      );
    }
    // 优化：正文字号 12px，行高 1.75，更舒展
    return <p className="text-[12px] leading-[1.75] my-1.5 text-white/80">{children}</p>;
  },
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="text-[12px] leading-[1.75] my-2 px-3 py-2 border-l-2 border-cyan-400/50 bg-white/[0.06] text-white/75 rounded-r">
      {children}
    </blockquote>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    // 优化：列表项间距 6px，更舒展
    <ul className="list-disc pl-5 my-1.5 space-y-1.5 text-[12px] text-white/80 marker:text-cyan-400/60 print:break-inside-avoid">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-5 my-1.5 space-y-1.5 text-[12px] text-white/80 marker:text-cyan-400/60 print:break-inside-avoid">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-[1.75] text-[12px] text-white/80 pl-0.5">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="text-white/95 font-semibold">{children}</strong>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-200 underline">
      {children}
    </a>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <table className="w-full my-1.5 text-[12px] text-white/80">{children}</table>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="hidden">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="flex justify-between border-b border-white/10 py-0.5 last:border-b-0">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="font-bold text-left py-0.5 text-white/90">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="py-0.5 text-white/75">{children}</td>
  ),
  hr: () => (
    <hr className="border-t border-white/10 my-5" />
  ),
};

export default async function ResumeContent({ type }: { type: string }) {
  const result = await getResumeContent(type);
  if (!result) {
    return <div className="text-white text-center py-20">简历不存在</div>;
  }
  const { data, content } = result;

  const hasAvatar = !!data.avatar;

  return (
    <article
      // 优化：边距略微收窄（左右 15mm），内容区域更大
      className={`resume relative z-10 w-[21cm] min-h-[29.7cm] mx-auto font-sans
                 bg-white/[0.05]
                 border border-white/[0.12] rounded-lg
                 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.08)_inset]
                 ${hasAvatar ? 'px-[15mm] pt-[14mm] pb-[15mm]' : 'px-[15mm] pt-[15mm] pb-[15mm]'}`}
    >
      {/* Header */}
      <header className={`${hasAvatar ? 'flex justify-between items-start' : 'text-center'} mb-6`}>
        <div className={hasAvatar ? 'flex-1' : ''}>
          <h1 className={`${hasAvatar ? 'text-[22px]' : 'text-[24px]'} font-bold tracking-wide leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]`}>
            {data.name}
          </h1>

          <div className={`mt-2 ${hasAvatar ? 'text-[11.5px] leading-[1.9]' : 'text-[12px] leading-[1.9]'} text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]`}>
            {hasAvatar ? (
              <>
                <p>{data.gender} | {data.age}岁</p>
                <p>{data.position} | {data.years}{data.education ? ` | ${data.education}` : ''}</p>
                <p>电话：<strong className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{data.phone}</strong> 邮箱：<strong className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{data.email}</strong></p>
              </>
            ) : (
              <>
                <p>{data.gender} | {data.age}岁 | {data.position} | {data.years}{data.education ? ` | ${data.education}` : ''}</p>
                <p className="mt-0.5"><strong className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{data.phone}</strong> | <strong className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{data.email}</strong></p>
              </>
            )}
          </div>
        </div>

        {hasAvatar && (
          <div
            className="w-[95px] h-[120px] bg-cover bg-center bg-no-repeat title shrink-0 ml-6 rounded shadow-md ring-1 ring-white/10"
            style={{ backgroundImage: `url(${data.avatar})` }}
          />
        )}
      </header>

      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
