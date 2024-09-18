import Image from "next/image";
import clsx from "clsx";

export default function Avatra() {
  const img = process.env.NODE_ENV === 'development' ? '/avatra.jpg' : '/my-resume/avatra.jpg'
  const classNames = clsx(
    "w-[8rem] h-[10rem] bg-url(' + img + ')' bg-cover",
  )
  return (
    // <Image 
    // src={img}
    // alt="My Avatra"
    // width={100}
    // height={120}
 
    // />
    <div className="w-[8rem] h-[10rem] bg-cover bg-[-53px] bg-no-repeat bg-[url('/avatra.jpg')] title">

    </div>
  )
}
