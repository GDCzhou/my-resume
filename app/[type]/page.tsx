import { notFound } from 'next/navigation';
import { getResumeList, getResumeByType } from '../lib/resumes';
import AcidBackground from '../components/AcidBackground';
import Toolbar from '../components/Toolbar';
import ResumeContent from '../components/ResumeContent';

export async function generateStaticParams() {
  const list = await getResumeList();
  return list.map(r => ({ type: r.type }));
}

export default async function ResumePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const resume = await getResumeByType(type);
  if (!resume) {
    notFound();
  }

  const resumeList = await getResumeList();

  return (
    <div className="min-h-screen relative py-[2rem] resume-page" data-resume-theme="dark">
      {/* 深色背景动画 — Galaxy 星空 */}
      <AcidBackground />

      {/* 浅色背景（默认隐藏，由主题切换控制） */}
      <div className="light-bg fixed inset-0 z-0 bg-gradient-to-br from-gray-50 to-gray-100 hidden" />

      {/* 统一工具栏 */}
      <Toolbar currentType={resume.type} resumeList={resumeList} />

      {/* A4 纸容器 */}
      <ResumeContent type={resume.type} />
    </div>
  );
}
