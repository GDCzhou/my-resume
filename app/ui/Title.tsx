export default function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold my-8 border-l-4 p-3  border-black bg-gray-200">
      {children}
    </h2>
  )
}
