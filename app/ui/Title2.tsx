interface TitleProps {
  children?: React.ReactNode;
  time?: string
  post?: boolean
  address?: string
}

function Title2(props: TitleProps) {
  const { children, time, post, address } = props
  return (

    <h3 className="text-lg font-bold my-2 flex justify-between">
      {children}
      {!post && <span className="font-normal text-[1rem] mr-2">前端工程师</span>}
      {time && <span className="font-normal text-[1rem] mr-2">{time}</span>}
      {address && <a href={address} className="font-normal text-sm mr-2 ">{address}</a>}
    </h3>


  )
}


export default Title2
