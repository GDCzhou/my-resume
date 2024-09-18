import Title from "./Title";
import Title2 from "./Title2";

export default function Experience() {
  return (
    <div>
      <Title>工作经历</Title>
      <ExperienceItem1 />
      <ExperienceItem2 />
    </div>
  )
}



function ExperienceItem1() {
  return (
    <div>
      <Title2 time="2022.01-2024.09">深圳市祥泷科技有限公司</Title2>
      <ul className="list-decimal list-inside">
        <li>
          负责公司产品的前端开发任务，与后端开发⼯程师共同完成设计效果，对新项⽬进⾏配合开发，对⽼项⽬进⾏ 优化、迭代更新，添加新功能。以Vue3交互为主完成参与公司模块设计。
        </li>
      </ul>
    </div>
  )
}


function ExperienceItem2() {
  return (
    <div>
      <Title2 time="2020.02-2022.01">环球数码科技有限公司</Title2>
      <ol className="list-decimal list-inside">
        <li className="mb-1">
          负责公司产品的前端开发任务，与后端开发⼯程师共同完成设计效果，对新项⽬进⾏配合开发，对⽼项⽬进⾏ 优化、迭代更新，添加新功能。以Vue3交互为主完成参与公司模块设计。

        </li>
        <li>
          根据⼯作安排，确保代码规范，使⽤插件和第三⽅库辅助项⽬开发，提⾼⼯作效率。 与团队配合，开发⾼复⽤组件，设计⽤⼾交互逻辑并实现。
        </li>
      </ol>
    </div>
  )
}
