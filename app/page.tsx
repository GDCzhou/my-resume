import { redirect } from 'next/navigation';
import { getResumeList } from './lib/resumes';

export default async function HomePage() {
  const list = await getResumeList();
  const first = list[0];
  redirect(first ? `/${first.type}` : '/resume');
}
