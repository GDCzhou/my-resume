import fs from 'node:fs/promises';
import path from 'node:path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AcidBackground from '../components/AcidBackground';
import { markdownComponents } from '../components/ResumeContent';

export const dynamic = 'force-static';

export default async function InterviewQaPage() {
  const filePath = path.join(process.cwd(), 'content', '简历项目面试问答.md');
  const raw = await fs.readFile(filePath, 'utf-8');

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
