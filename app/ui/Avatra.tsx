import Image from "next/image";

export default function Avatra() {
  const img = process.env.NODE_ENV === 'development' ? '/avatra.jpg' : '/my-resume/avatra.jpg'
  return (
    <Image 
    src={img}
    alt="My Avatra"
    width={100}
    height={120}
    className="w-[8rem] h-[10rem] object-cover"
    />
  )
}
