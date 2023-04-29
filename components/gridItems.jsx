import Image from "next/image";

const GridItems = () => (
  <div class="grid-item">
    <div className="Item">
          <Image
            className="rounded-xl"
            src="/img1.png"
            alt="GridItem1"
            width={300}
            height={50}
          />
              <div class="grid-item-description text-center">
                  <h1 class="webname" data-text="project1Title">FastFood Website</h1>
                      <h4 class="webdesc">Html,Css</h4>
                      <div class="bt-cont">
                          <a class="bt-repo" target="_blank" href="https://github.com/YukaC/Website">
                              <i class="fa-brands fa-github">
                                  <span data-text="nameRepo">Repository</span>
                              </i>
                          </a>
                      </div>
              </div>
      </div>

      <div className="Item">
          <Image
            className="rounded-xl"
            src="/img2.png"
            alt="GridItem2"
            width={300}
            height={50}
          />
              <div class="grid-item-description text-center">
                  <h1 class="webname" data-text="project1Title">Movie Review Website</h1>
                      <h4 class="webdesc">Css,Javascript,Python,Flask</h4>
                      <div class="bt-cont">
                          <a class="bt-repo" target="_blank" href="https://github.com/YukaC/TrabajoFinal_Ciucani_Grecco">
                              <i class="fa-brands fa-github">
                                  <span data-text="nameRepo">Repository</span>
                              </i>
                          </a>
                      </div>
              </div>
      </div>

      <div className="Item">
          <Image
            className="rounded-xl"
            src="/img3.png"
            alt="GridItem3"
            width={300}
            height={50}
          />
              <div class="grid-item-description text-center">
                  <h1 class="webname" data-text="project1Title">Portfolio</h1>
                      <h4 class="webdesc">React,TailwindCss,NextJs</h4>
                      <div class="bt-cont">
                          <a class="bt-repo" target="_blank" href="https://github.com/YukaC/yukac.github.io">
                              <i class="fa-brands fa-github">
                                  <span data-text="nameRepo">Repository</span>
                              </i>
                          </a>
                      </div>
              </div>
      </div>
  </div>
);

export default GridItems;