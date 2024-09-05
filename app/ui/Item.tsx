import Title from "./Title";
import Title2 from "./Title2";

export default function Item() {
  return (
    <div>
      <Title>项目经验</Title>
      <Item1 />
      <Item2 />
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
