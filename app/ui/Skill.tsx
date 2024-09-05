import Title from "./Title";

export default function Skill() {
  const skillList = [
    '掌握vue3框架以及vue3全家桶(pinia、vue-router4)，Vite',
    '掌握vue2 框架及使用 vue2 全家桶(vuex、vue-router)，vue-cli',
    '掌握react框架及使用 react hooks',
    '掌握UI组件:Element UI/Element Plus',
    '掌握网络通信基础，如axios库，http协议,sse协议，以及实时通讯协议websocket构建ai平台',
    '熟悉HTML、CSS、JavaScript、TypeScript语法基础',
    '熟悉Echarts可视化,会使用antV、DataV等可视化工具',
    '熟悉tailwind css框架来快速书写样式',
    '熟悉git工作流',
    '了解ES6语法基础,CSS 处理器sass scss less',
    '了解JavaScript语法进阶,包括:作用域和闭包、this和对象原型等',
    'Node.js,构建工具 Webpack,计算机网络和数据结构,python爬虫、mysql和java，Linux命令',
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
