import Title from "./Title";
import Title2 from "./Title2";

export default function Item() {
  return (
    <div>
      <Title>项目经验</Title>
      <Item1 />
      <Item2 />
      <Item3 />
      <Item4 />
      <Item5 />
      
    </div>
  )
}



function Item1() {
  return (
    <div>
      <Title2 time="2022.02-2022.08" post >vue3.2通用后台管理系统</Title2>
      <h4>项目介绍：该项目为一个通用后台管理系统，用户可以根据需求用于不同业务的后台管理，主要有用户管理、权限管理、商品管 理、订单管理、数据统计等功能</h4>
      <p>技术栈：vue3、vuex、axios、git、element-plus</p>
      <ul className="list-decimal list-inside">
        <h5>主要负责: </h5>
        <li> 登录页面编写：编写登录页面(静态)、配置使用svg自定义图标组件、编写表单校验、登录请求、请求响应拦截器、 localStorage存储token、使用路由守卫实现用户访问限制</li>
      <li>主界面功能编写：主界面layout布局（静态）、menus菜单静态及路由、指定时间被动退出、汉堡按钮伸缩顶、动态面包屑导航、点击头像退出、使用i18n实现中英切换、点击全屏、用户引导</li>
      <li>用户管理功能编写：用户表格（静态）、分页器、添加用户、删除用户、编辑用户等</li>

      </ul>
      <ol className="list-decimal list-inside">
        <h5>技术亮点:</h5>
        <li> 通过配置代理proxy解决跨域问题</li>
        <li> 使用到路由守卫token来解决登录后下一次不用登录就进入主界面</li>
        <li> 使用element-plus中的layout布局登录后的主界面</li>
        <li> 使用axios的响应拦截器来获取想要的指定响应数据，请求拦截器为每一个接口添加上token信息</li>
        <li> 使用driver.js第三方库和相关配置编写实现用户引导</li>
      </ol>
    </div>
    
  )
}


function Item2() {
  return (
    <div>
      <Title2 time="2022.02-2022.08" post >旺旺商城</Title2>
      <h4>项目介绍：该项目为电商平台，用户可以在商城购买各种商品，主要功能包括首页、商品分类、商品详情、购物车和结算支付、 会员中心等</h4>
      <p>技术栈: vue3-setup、pinia、axios、element-plus、vue-router、vueuse、git</p>
      <ul className="list-decimal list-inside">
        <h5>主要负责: 除静态页面以外每个功能的组件交互编写、数据渲染编写、接口请求封装和部分工具类的封装、pinia管理复用的数据 和方法、路由及跳转配置 </h5>
      </ul>
      <ol className="list-decimal list-inside">
        <h5>技术亮点:</h5>
        <li>吸顶导航交互</li>
        <li>图片懒加载自定义指令</li>
        <li>面板插槽组件等业务通用组件</li>
        <li>SKU电商组件使用</li>
        <li>图片组件细节预览</li>
        <li>支付宝三方支付</li>
        <li>pinia用户持久化存储persist</li>
      </ol>
    </div>
    
  )
}


function Item3() {
  return (
    <div>
      <Title2 time="2023.09-2024.01" post >通用数据大屏可视化</Title2>
      <h4>项目介绍:该项目为各种数据整合的图表可视化，用户可以根据自己需求使用。一共有4部分组成，一共包含11种图，分别为：大 区横向柱形图、服务竖向柱形图、报警风险雷达图、异常处理双环形图、数据传递关系图、关键词条文档云图、数据总览图、地图可视化、散点图、动态柱形图、时间轴图</h4>
      <p>技术栈：Vue3、Echarts5、axios、git</p>
      <ul className="list-decimal list-inside">
        <h5>除css编写外各种Echarts图表的配置和使用，接口请求封装，axios响应拦截器来获取指定响应数据，动态渲染数据 至图表，快速打包部署预览</h5>
      </ul>
      <ol className="list-decimal list-inside">
        <h5>技术亮点:</h5>
        <li>通过watch生命周期钩子监听每次数据变化并重新渲染图表（动态渲染）</li>
        <li>使用map方法去筛选每个子组件需要展示的数据</li>
        <li>饼图叠加实现异常处理双环形图</li>
        <li>使用echarts-wordclound和countUp.js第三方库分别实现词云图和数字快速跳动效果</li>
        <li>使用响应拦截器对获取到的数据进行解构和处理请求成功失败情况，确保获取指定数据</li>
        <li>无需购买服务器快速打包部署至GitHub Page预览</li>
      </ol>


    </div>
  )
}


function Item4() {
  return (
    <div>
      <Title2 time="2023.09-2024.01" post >深圳指数官网</Title2>
      <h4>项目介绍：该项目为分公司的官网，开发周期为2周，纯前端实现</h4>
      <p>技术栈：vue3,pinia,element-plus,vue-router,git</p>
      <ul className="list-decimal list-inside">
        <h5>除css编写外各种Echarts图表的配置和使用，接口请求封装，axios响应拦截器来获取指定响应数据，动态渲染数据 至图表，快速打包部署预览</h5>
      </ul>
      <ol className="list-decimal list-inside">
        <h5>技术亮点:</h5>
        <li>基于flex布局完成首页、关于我们、产品解决方案、研发创新、新闻中心五个模块）</li>
        <li>自适应postcss-px-to-viewport方案，适配不同尺寸设备，还原设计稿比例</li>
        <li>router-link锚点跳转方案，实现页面内跳转</li>
        <li>图片资源优化webP，首屏加载优化方案等</li>
        <li>基于i18n方案实现中英切换功能</li>
        <li>基于element-plus组件库实现菜单，分页，轮播等</li>
      </ol>
    </div>
  )
}


function Item5() {
  return (
    <div>
      <Title2 time="2023.09-2024.01" post >AFH-LED-HW-G1</Title2>
      <h4>项目介绍：该项目深圳指数- AI智能生成硬件-的项目，项目主要为：登陆模块（权限管理）、生成模块、跟AI沟通生成需求模 块、用户管理模块（仅管理员可见）、生成记录模块</h4>
      <p>技术栈：vue2,websocket,sessionStorage,canvas,element ui</p>
      <ul className="list-decimal list-inside">
        <h5>主要负责</h5>
        <li>项目总体样式重构和优化，迁移合并至4.19项目初始版本</li>
        <li>登陆模块重构和优化：登录后根据权限（用户，管理员）做资源分配和跳转，可登出</li>
        <div>(1)用户：1、加载逻辑为新接口，加载页面会有 “图纸开始生成，可在左侧生成记录中查看进度”文字显示2、预览模式：可预 览进行生成中流程、已完成流程（下载）</div>
        <div>(2)管理员：1、用户管理功能，可添加和删除用户。2、预览模式：只可预览用户已完成状态流程下文件（下载）</div>
        <li>需求合成文件功能优化和重构</li>
        <div>(1)上传excel需求文件表格预览重构优化</div>
        <div>(2)Dxf 按键判断和Excel需求文件按键判断（前端）通过才可进行合成</div>
        <div>(3)点击“开始启动生成”前通过“获取系统运行状态”接口和按键是否匹配判断是否可运行，均有提示</div>
        <div>(4)进度条相关逻辑重构和优化：具体为进度条1加载完毕获取图纸雪花图展示&gt;进度条2加载完毕获取文件下载链接</div>
        <li>跟AI沟通需求文件功能优化和重构</li>
        <div>(1)总体ui优化：自适应响应式，底部输入动态渐变动画，按钮，上传附件等</div>
        <div>(2)ai沟通逻辑重构优化：由http更换为websocket实时展示ai输出内容，以及ai初始默认发送一条消息，未输入不可生成需求文件</div>
        <div>(3)生成需求文件功能：1.预览需求文件表格：表格由ai后端接口内容返回：可修改编辑每项和保存。2.确认需求文件并上传DXF 图纸：确定完需求文件，自动上传至“需求合成文件”功能模块</div>
        <li>和ai沟通需求：如用户不满意当前生成表格，可根据之前沟通内容继续生成。</li>
        <li>下载需求：前端生成沟通完毕需求对应的excel文件，用户点击即可下载。</li>
        <li>用户管理（仅管理员可见）</li>
        <div>
        (1)查看记录：查看用户生成的订单的各种信息。例如生成时间，更新时间，生成状态，反馈内容，下载文件，上传文件等，以及 生成状态的筛选
        </div>
        <div>
        (2)反馈功能：用户可对订单进行反馈，包括反馈内容，回传图纸（上传dxf文件），不合理项勾选，截图反馈（可上传多个截图，放大看细节或删除）,提交成功和失败均有提示
        </div>
        <div>
        (3)预览功能：在不同预览状态点击预览模式可跳转至生成模块对应的状态流程
        </div>

      </ul>
      <ol className="list-decimal list-inside">
        <h5>技术亮点:</h5>
        <li>基于flex布局重构和优化项目总体样式</li>
        <li>使用websocket实现ai沟通对话生成需求</li>
        <li>使用sessionStorage来存储用户token和角色，姓名等信息，以及ai自动上传，预览模式所需要的兄弟组件传值</li>
        <li>.使用element UI组件库快速实现生成记录和用户管理</li>
        <li>请求拦截器为每个接口加上token请求头，响应拦截器根据后端返的code来进行相应token失效/过期处理</li>
        <li>测试环境和正式环境的配置。注：只有打包后版本才会切正式环境，其余皆为测试环境</li>
        <li>使用live server来预览正式上线版本的项目</li>
      </ol>
    </div>
  )
}
