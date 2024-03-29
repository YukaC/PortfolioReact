import { useState } from "react";
import Image from "next/image";
import projectData from "../components/gridItems";

const GridItem = ({ imgSrc, alt, title, description, repoLink }) => {
  return (
    <div id="grid-item" className="grid relative mb-10 lg:ml-8 min-h-[32rem]">
      <a
        href={repoLink}
        className="flex p-2 flex-col items-stretch border border-gray-200 rounded-lg shadow lg:max-w-2xl bg-opacity-40 hover:bg-white hover:backdrop-blur-3xl hover:bg-opacity-10 dark:border-gray-700 bg-[#1E2040]"
      >
        <Image
          className="rounded-xl min-w-[16rem] lg:max-w-full"
          src={imgSrc}
          alt={alt}
          width={480}
          height={70}
        />
        <div className="flex flex-col justify-between p-4 leading-normal max-w-lg">
          <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {title}
          </h5>
          <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">
            {description}
          </p>
        </div>
      </a>
    </div>
  );
};

const GridItems = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    {projectData.map((project) => (
      <div
        key={project.title}
        className="col-span-1 md:col-span-2 lg:col-span-1"
      >
        <GridItem {...project} />
      </div>
    ))}
  </div>
);

export default GridItems;
