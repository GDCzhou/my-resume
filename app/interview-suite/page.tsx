import fs from 'node:fs/promises';
import path from 'node:path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AcidBackground from '../components/AcidBackground';
import { markdownComponents } from '../components/ResumeContent';

export const dynamic = 'force-static';

const SUITE_DIR = path.join(process.cwd(), 'content', 'interview-suite');

// 渲染主文档 + 宝典附录（java P01-P98 + ai 主题）
export default async function InterviewSuitePage() {
  // 1. 主文档（简历定制面试题）
  const mainRaw = await fs.readFile(path.join(SUITE_DIR, '简历定制面试题.md'), 'utf-8');

  // 2. 宝典附录：java P01-P98
  const javaFiles = (await fs.readdir(path.join(SUITE_DIR, 'java')))
    .filter(f => f.endsWith('.md'))
    .sort((a, b) => {
      const ma = a.match(/^P(\d+)/);
      const mb = b.match(/^P(\d+)/);
      if (ma && mb) return parseInt(ma[1]) - parseInt(mb[1]);
      if (a.startsWith('index')) return -1;
      if (b.startsWith('index')) return 1;
      return a.localeCompare(b);
    });
  const javaSections = await Promise.all(
    javaFiles.map(async f => {
      const raw = await fs.readFile(path.join(SUITE_DIR, 'java', f), 'utf-8');
      return raw;
    })
  );

  const raw = mainRaw + '\n\n---\n\n# 附录：Java 面试宝典（P01-P98）\n\n' + javaSections.join('\n\n---\n\n');

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