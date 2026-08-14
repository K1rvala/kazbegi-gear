(function () {
  "use strict";

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);

  const hero = document.querySelector(".hero");
  if (!hero) return;

  const mm = gsap.matchMedia();

  mm.add(
    {
      reduced: "(prefers-reduced-motion: reduce)",
      desktop: "(prefers-reduced-motion: no-preference) and (min-width: 768px)",
      mobile: "(prefers-reduced-motion: no-preference) and (max-width: 767px)",
    },
    (context) => {
      const { reduced, mobile } = context.conditions;

      if (reduced) return;

      const travel = mobile ? 0.55 : 1;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      tl.to(".layer-sun", { y: -40 * travel, ease: "none" }, 0)
        .to(".layer-far", { y: -60 * travel, ease: "none" }, 0)
        .to(".layer-mid", { y: -130 * travel, ease: "none" }, 0)
        .to(".layer-near", { y: -210 * travel, ease: "none" }, 0);
    }
  );
})();
