interface TitleProps {
  children?: React.ReactNode;
  time: string
  post?: boolean
}

function Title2(props: TitleProps) {
  const { children, time, post } = props
  return (

    <h3 className="text-lg font-bold my-2 flex justify-between">{children} {!post && <span className="font-normal text-[1rem] mr-2">前端工程师</span>}<span className="font-normal text-[1rem] mr-2">{time}</span></h3>


  )
}


export default Title2
