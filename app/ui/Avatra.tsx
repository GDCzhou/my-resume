import Image from "next/image";

export default function Avatra() {
  return (
    <Image 
    src={"/my-resume/images/avatra.jpg"}
    alt="My Avatra"
    width={100}
    height={120}
    className="w-[8rem] h-[10rem] object-cover"
    />
  )
}
