import { notFound } from 'next/navigation';
import { RESUME_LIST } from '../config';
import AcidBackground from '../components/AcidBackground';
import Toolbar from '../components/Toolbar';
import ResumeContent from '../components/ResumeContent';

export function generateStaticParams() {
  return RESUME_LIST.map(r => ({ type: r.type }));
}

export default async function ResumePage({ params }: { params: { type: string } }) {
  const resume = RESUME_LIST.find(r => r.type === params.type);
  if (!resume) {
    notFound();
  }

  return (
    <div className="min-h-screen relative py-[2rem]">
      {/* 酷炫背景动画 — Galaxy 星空（深色不透明背景） */}
      <AcidBackground />

      {/* 统一工具栏 */}
      <Toolbar currentType={resume.type} />

      {/* A4 纸容器 */}
      <ResumeContent type={resume.type} />
    </div>
  );
}
