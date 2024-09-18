

export default function Avatra() {
  const img = process.env.NODE_ENV === 'development' ? '/avatra.jpg' : '/my-resume/avatra.jpg'
  return (
    <div className="w-[8rem] h-[10rem] bg-cover bg-[-53px] bg-no-repeat  title" 
    style={{backgroundImage: `url(${img})`}}
    />
  )
}
