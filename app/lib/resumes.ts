import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

export interface ResumeItem {
  type: string;
  file: string;
  label: string;
  position?: string;
  order: number;
}

const CONTENT_DIR = path.join(process.cwd(), 'content');

/**
 * 从文件名推导路由 type
 * - resume-xxx.md  →  xxx
 * - resume.md      →  frontend（兼容旧版）
 * - 其他 .md       →  去掉 .md 后缀
 */
function filenameToType(filename: string): string {
  const base = filename.replace(/\.md$/, '');
  if (base === 'resume') return 'frontend';
  if (base.startsWith('resume-')) return base.slice('resume-'.length);
  return base;
}

let cachedList: ResumeItem[] | null = null;
let cachedMtime = 0;

export async function getResumeList(): Promise<ResumeItem[]> {
  // 开发模式下每次重新扫描，生产环境缓存
  const isDev = process.env.NODE_ENV !== 'production';

  if (!isDev && cachedList) return cachedList;

  const files = await fs.readdir(CONTENT_DIR);
  const mdFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('简历项目'));

  const items: ResumeItem[] = [];

  for (const file of mdFiles) {
    const filePath = path.join(CONTENT_DIR, file);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const { data } = matter(raw);
      const type = filenameToType(file);
      const label = data.label || data.position || type;
      const order = typeof data.order === 'number' ? data.order : 100;

      items.push({
        type,
        file,
        label: String(label),
        position: data.position ? String(data.position) : undefined,
        order,
      });
    } catch (e) {
      // 跳过解析失败的文件
      console.warn(`[resumes] failed to parse ${file}`, e);
    }
  }

  // 按 order 升序，order 相同按文件名倒序（v3 在 v2 前面）
  items.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return b.type.localeCompare(a.type);
  });

  if (!isDev) cachedList = items;
  return items;
}

export async function getResumeByType(type: string): Promise<ResumeItem | undefined> {
  const list = await getResumeList();
  return list.find(r => r.type === type);
}

export async function getResumeContent(type: string): Promise<{ data: Record<string, any>; content: string } | null> {
  const resume = await getResumeByType(type);
  if (!resume) return null;

  const filePath = path.join(CONTENT_DIR, resume.file);
  const raw = await fs.readFile(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return { data, content };
}
