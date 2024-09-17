import Header from "./ui/Header";
import Skill from "./ui/Skill";
import Experience from "./ui/Experience";
import Item from "./ui/Item";
import Education from "./ui/Educat";

export default function Resume() {
  return (
    <div className="resume w-[21cm] min-h-[29.7cm] mx-auto my-[2rem] bg-white px-[2em] py-[2rem] ">
      <Header />
      <Skill />
      <Experience />
      <Item />
      <Education />
    </div>
  );
}
