import Title from "./Title";

export default function Skill() {
  const skillList = [
    '熟练掌握vue3框架以及vue3全家桶(pinia、vue-router4)',
    '熟练掌握vue2 框架及使用 vue2 全家桶(vuex、vue-router)，vue-cli',
    '熟练掌握react框架及使用 react hooks',
    '熟练掌握UI组件:Element UI/Element Plus',
    '熟练掌握HTML、CSS、JavaScript、TypeScript语法基础',
    '熟练掌握Echarts等可视化工具',
    '熟练掌握ES6、ES7,CSS 处理器sass scss less',
    '熟练掌握vite,webpack等构建工具',
    '熟练使用Node.js，搭建后台api接口',
  ]
  return (
    <div>
      <Title >掌握技能</Title>
      <ol className="list-decimal list-inside">
        {skillList.map((item, index) => (
          <li key={index} className="">{item}</li>
        ))}
      </ol>
    </div>
  )
}
