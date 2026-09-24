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
const PROFILE_DIR = path.join(CONTENT_DIR, 'profile');

// 子目录：归档简历/项目文档/分类QA，不参与简历列表
const SKIP_SUBDIRS = new Set(['resumes-archive', 'projects', 'qa', 'interview']);

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

// 深合并：右边覆盖左边，嵌套对象也合并
function deepMerge<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result = { ...base } as Record<string, any>;
  for (const [key, val] of Object.entries(override)) {
    if (val === undefined || val === null) continue;
    if (
      val && typeof val === 'object' && !Array.isArray(val) &&
      result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], val as Record<string, any>);
    } else {
      result[key] = val;
    }
  }
  return result as T;
}

let profileCache: Record<string, Record<string, any>> | null = null;

async function loadProfile(name: string): Promise<Record<string, any>> {
  if (!profileCache) profileCache = {};
  if (profileCache[name]) return profileCache[name];

  const filePath = path.join(PROFILE_DIR, `${name}.md`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data } = matter(raw);
    profileCache[name] = data;
    return data;
  } catch (e) {
    console.warn(`[resumes] profile not found: ${name}`);
    return {};
  }
}

let cachedList: ResumeItem[] | null = null;

export async function getResumeList(): Promise<ResumeItem[]> {
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev && cachedList) return cachedList;

  const files = await fs.readdir(CONTENT_DIR);
  const mdFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('简历项目'));

  const items: ResumeItem[] = [];
  const subDirMds = await Promise.all(
    [...SKIP_SUBDIRS].map(async dir => {
      try {
        const subFiles = await fs.readdir(path.join(CONTENT_DIR, dir));
        return new Set(subFiles.filter(f => f.endsWith('.md')));
      } catch {
        return new Set<string>();
      }
    })
  );
  const excluded = new Set<string>(subDirMds.flatMap(s => [...s]));

  for (const file of mdFiles) {
    if (excluded.has(file)) continue;
    const filePath = path.join(CONTENT_DIR, file);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const { data } = matter(raw);
      const type = filenameToType(file);

      // 如果有 profile，先合并 profile 数据
      let merged = data;
      if (data.profile) {
        const profileData = await loadProfile(String(data.profile));
        merged = deepMerge(profileData, data);
      }

      const label = merged.label || merged.position || type;
      const order = typeof merged.order === 'number' ? merged.order : 100;

      items.push({
        type,
        file,
        label: String(label),
        position: merged.position ? String(merged.position) : undefined,
        order,
      });
    } catch (e) {
      console.warn(`[resumes] failed to parse ${file}`, e);
    }
  }

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

  // 合并 profile 数据（简历 frontmatter 优先级更高）
  let merged = data;
  if (data.profile) {
    const profileData = await loadProfile(String(data.profile));
    merged = deepMerge(profileData, data);
  }

  return { data: merged, content };
}
