import { useState } from "react";
import Image from "next/image";
import projectData from "../components/gridItems";

const GridItem = ({ imgSrc, alt, title, description, repoLink }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleHover = () => {
    setIsHovered(true);
  };

  const handleLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      id="grid-item"
      className="relative mb-10 md:ml-8"
      onMouseEnter={handleHover}
      onMouseLeave={handleLeave}
    >
      <div className="grid-item-img">
        <Image
          className="rounded-xl min-w-[16rem] md:max-w-full"
          src={imgSrc}
          alt={alt}
          width={480}
          height={70}
        />
        <div
          id="grid-item-description"
          className={`text-center rounded-xl space-y-2 text-sm absolute top-0 left-0 w-full h-full bg-gray-900 bg-opacity-80 text-white p-4 opacity-0 transition-opacity duration-700 ${
            isHovered ? "opacity-100" : ""
          } flex flex-col justify-center items-center`}
        >
          <h2 className="webname" data-text="project1Title">
            {title}
          </h2>
          <h4 className="webdesc">{description}</h4>
          <div className="flex justify-center bt-cont">
            <a className="bt-repo" target="_blank" href={repoLink}>
              <button
                className="flex px-4 py-1.5 text-white transition-all duration-200 rounded-md cursor-pointer center bg-main-color hover:bg-shadow-main-color"
              >
                <span data-text="nameRepo">Repository</span>
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const GridItems = () => (
  <>
    {projectData.map((project) => (
      <GridItem key={project.title} {...project} />
    ))}
  </>
);

export default GridItems;
