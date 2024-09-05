import Header from "./ui/Header";
import Skill from "./ui/Skill";
import Experience from "./ui/Experience";
import Item from "./ui/Item";

export default function Resume() {
  return (
    <div className="w-[21cm] min-h-[29.7cm] mx-auto bg-white p-8 shadow-lg">
      <Header />
      <Skill />
      <Experience />
      <Item />
    </div>
  );
}
