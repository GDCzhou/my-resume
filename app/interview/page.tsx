import fs from 'node:fs/promises';
import path from 'node:path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AcidBackground from '../components/AcidBackground';
import { markdownComponents } from '../components/ResumeContent';

export const dynamic = 'force-static';

const INTERVIEW_DIR = path.join(process.cwd(), 'content', 'interview');

// 文件名排序：00-目录 → P01..P98 → 专题
function sortFiles(files: string[]): string[] {
  return files.sort((a, b) => {
    const rank = (f: string): [number, number] => {
      if (f.startsWith('00-')) return [0, 0];
      const m = f.match(/^P(\d+)/);
      if (m) return [1, parseInt(m[1])];
      return [2, 0]; // 专题放最后
    };
    const [ra, na] = rank(a);
    const [rb, nb] = rank(b);
    return ra !== rb ? ra - rb : na - nb;
  });
}

export default async function InterviewPage() {
  const files = (await fs.readdir(INTERVIEW_DIR)).filter(f => f.endsWith('.md')).sort();
  const ordered = sortFiles(files);

  const sections = await Promise.all(
    ordered.map(async file => {
      const raw = await fs.readFile(path.join(INTERVIEW_DIR, file), 'utf-8');
      return raw;
    })
  );
  const raw = sections.join('\n\n---\n\n');

  return (
    <div className="min-h-screen relative py-[2rem]">
      <AcidBackground />
      <article
        className="resume relative z-10 w-[21cm] min-h-[29.7cm] mx-auto
                   bg-white/[0.05]
                   border border-white/[0.12] rounded-lg
                   shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.08)_inset]
                   px-[2em] pt-[1.5rem] pb-[1.5rem]"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {raw}
        </ReactMarkdown>
      </article>
    </div>
  );
}