'use strict';

/**
 * PRELOADER
 */

const preloader = document.querySelector("[data-preloader]");

window.addEventListener("load", function () {
  preloader.classList.add("loaded");
  document.body.classList.add("loaded");
});

/**
 * MOBILE NAV TOGGLE
 */

const navbar = document.querySelector("[data-navbar]");
const navToggler = document.querySelector("[data-nav-toggler]");
const navLinks = document.querySelectorAll(".navbar-link");

const toggleNavbar = function () {
  navbar.classList.toggle("active");
  document.body.classList.toggle("nav-open");
};

// Close menu when a link is clicked
navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (navbar.classList.contains("active")) {
      navbar.classList.remove("active");
      document.body.classList.remove("nav-open");
    }
  });
});

navToggler.addEventListener("click", toggleNavbar);

/**
 * HEADER
 *
 * active header when window scrolled to 50px
 */

const header = document.querySelector("[data-header]");

const activeHeader = function () {
  if (window.scrollY > 50) {
    header.classList.add("active");
  } else {
    header.classList.remove("active");
  }
};

window.addEventListener("scroll", activeHeader);

/**
 * SMOOTH SCROLL & ACTIVE LINK
 * Highlights the nav link based on scroll position
 */

const sections = document.querySelectorAll("section[id]");

function highlightNav() {
  const scrollY = window.pageYOffset;
  const windowHeight = window.innerHeight;

  sections.forEach((section) => {
    const sectionHeight = section.offsetHeight;
    const sectionTop = section.offsetTop - 100; // Offset for header
    const sectionId = section.getAttribute("id");
    const navLink = document.querySelector(`.navbar-link[href="#${sectionId}"]`);

    if (navLink) {
      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
        navLink.classList.add("active");
      } else {
        navLink.classList.remove("active");
      }
    }
  });
}

window.addEventListener("scroll", highlightNav);

// Initial check
highlightNav();

/**
 * SCROLL ANIMATIONS
 * Uses Intersection Observer for performance
 */

const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.15
};

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      // Optionally unobserve after animation triggers
      // sectionObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.section').forEach((section) => {
  sectionObserver.observe(section);
});
