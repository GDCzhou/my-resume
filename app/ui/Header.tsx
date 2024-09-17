import Avatra from "./Avatra";


export default function Header() {
  return (
    <header className="flex justify-between">
      <div>
        <h1 className="text-3xl font-bold mb-5">周敏</h1>
        <p className="my-2 leading-7">男 | 29岁</p>
        <p className="mb-2">前端工程师 | 3年</p>
        <p>电话: <strong>19397705570</strong> 邮箱: <strong>996078450@qq.com</strong></p>
      </div>
      {/* <Avatra /> */}
    </header>
  )
}
