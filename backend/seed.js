/**
 * Seeds the public catalogue (course categories, courses, modules, lessons,
 * product categories and products) into MongoDB.
 *
 * Source of truth: drizzle/migrations/0002_learningbix_seed_catalog.sql
 *
 * Usage: npm run seed
 */
require("dotenv").config();

const mongoose = require("mongoose");
const { connectDatabase } = require("./config/db");
const {
  CourseCategory,
  Course,
  CourseModule,
  Lesson,
  ProductCategory,
  StoreProduct,
} = require("./models");

const HERO_IMAGE =
  "/__l5e/assets-v1/f5e2673e-fca8-48a5-baff-f41cad8724ed/hero-kids-robotics.jpg";

const COURSE_CATEGORIES = [
  { name: "Robotics", slug: "robotics", description: "Build robots, circuits and intelligent machines.", position: 1 },
  { name: "Coding", slug: "coding", description: "Programming skills through fun, interactive projects.", position: 2 },
  { name: "Pre-School", slug: "preschool", description: "Early learning through creativity and exploration.", position: 3 },
  { name: "STEM Education", slug: "stem", description: "Science, technology, engineering and maths by doing.", position: 4 },
  { name: "AI & Machine Learning", slug: "artificial-intelligence", description: "Teach machines to see, hear and decide.", position: 5 },
];

// [categorySlug, slug, title, short_description, image_url, age_group, duration, level, price]
const COURSES = [
  ["robotics", "beginner-robotics", "Robotics for Beginners", "Build your first moving robot with motors, wheels and simple logic.", "/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg", "6-9 yrs", "8 weeks", "Beginner", 4999],
  ["robotics", "intermediate-robotics", "Intermediate Robotics", "Program sensors and make robots react to light, sound and obstacles.", "/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg", "9-12 yrs", "10 weeks", "Intermediate", 6999],
  ["robotics", "advanced-robotics", "Advanced Robotics", "Design autonomous robots with microcontrollers and multi-sensor logic.", "/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg", "12-16 yrs", "12 weeks", "Advanced", 8999],
  ["robotics", "electronics-basics", "Electronics", "Circuits, LEDs, resistors and breadboards explained through mini builds.", "/__l5e/assets-v1/cc2fe425-2b46-47e1-b442-8ea35ef1e8b5/program-stem.jpg", "8-12 yrs", "6 weeks", "Beginner", 3999],
  ["robotics", "sensors-and-motors", "Sensors and Motors", "Servo, DC and stepper motors plus ultrasonic, IR and touch sensors.", "/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg", "10-14 yrs", "8 weeks", "Intermediate", 5499],
  ["robotics", "iot-and-electronics", "IoT and Electronics", "Connect devices to the internet and build a smart home model.", "/__l5e/assets-v1/cc2fe425-2b46-47e1-b442-8ea35ef1e8b5/program-stem.jpg", "11-16 yrs", "10 weeks", "Intermediate", 6999],
  ["robotics", "automation", "Automation", "Conveyor belts, sorting machines and automatic doors with code.", "/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg", "12-16 yrs", "8 weeks", "Advanced", 6499],
  ["coding", "scratch-coding", "Scratch Coding", "Create animations, stories and games with drag-and-drop blocks.", "/__l5e/assets-v1/eeff49ac-ae71-4a82-b2a3-3cdeab4ca080/program-coding.jpg", "6-10 yrs", "8 weeks", "Beginner", 3999],
  ["coding", "block-based-coding", "Block-Based Coding", "Sequences, loops and conditions with visual coding puzzles.", "/__l5e/assets-v1/eeff49ac-ae71-4a82-b2a3-3cdeab4ca080/program-coding.jpg", "5-8 yrs", "6 weeks", "Beginner", 2999],
  ["coding", "python-programming", "Python Programming", "Real-world Python: variables, functions, games and data projects.", "/__l5e/assets-v1/eeff49ac-ae71-4a82-b2a3-3cdeab4ca080/program-coding.jpg", "10-16 yrs", "12 weeks", "Intermediate", 6999],
  ["coding", "cpp-programming", "C++ Programming", "Problem-solving with C++ and Arduino-style hardware programming.", "/__l5e/assets-v1/eeff49ac-ae71-4a82-b2a3-3cdeab4ca080/program-coding.jpg", "12-16 yrs", "12 weeks", "Advanced", 7499],
  ["coding", "web-development-basics", "Web Development Basics", "Build and publish your own website with HTML, CSS and JavaScript.", "/__l5e/assets-v1/eeff49ac-ae71-4a82-b2a3-3cdeab4ca080/program-coding.jpg", "11-16 yrs", "10 weeks", "Intermediate", 5999],
  ["coding", "game-development", "Game Development", "Design levels, characters and scoring systems for your own game.", "/__l5e/assets-v1/eeff49ac-ae71-4a82-b2a3-3cdeab4ca080/program-coding.jpg", "9-14 yrs", "10 weeks", "Intermediate", 5999],
  ["artificial-intelligence", "artificial-intelligence", "Artificial Intelligence", "A friendly first course in how AI thinks, learns and decides.", "/__l5e/assets-v1/0a9a877e-4eab-4dcf-ae4c-ded28a7db590/program-ai.jpg", "10-16 yrs", "8 weeks", "Beginner", 5999],
  ["artificial-intelligence", "machine-learning-basics", "Machine Learning Basics", "Train models to classify images and sounds without heavy maths.", "/__l5e/assets-v1/0a9a877e-4eab-4dcf-ae4c-ded28a7db590/program-ai.jpg", "12-16 yrs", "10 weeks", "Intermediate", 6999],
  ["artificial-intelligence", "computer-vision", "Computer Vision", "Face detection, colour tracking and object recognition with a webcam.", "/__l5e/assets-v1/0a9a877e-4eab-4dcf-ae4c-ded28a7db590/program-ai.jpg", "12-16 yrs", "10 weeks", "Advanced", 7999],
  ["artificial-intelligence", "ai-projects", "AI Projects", "Capstone projects: voice assistant, smart camera and chatbot.", "/__l5e/assets-v1/0a9a877e-4eab-4dcf-ae4c-ded28a7db590/program-ai.jpg", "13-16 yrs", "8 weeks", "Advanced", 7499],
  ["preschool", "little-innovators", "Little Innovators", "Shapes, gears, colours and stories that spark early curiosity.", "/__l5e/assets-v1/019ed067-d54a-491d-96e4-ae33452ad482/program-preschool.jpg", "3-5 yrs", "12 weeks", "Beginner", 2999],
  ["preschool", "tiny-engineers", "Tiny Engineers", "Build-and-play activities that grow fine motor and logic skills.", "/__l5e/assets-v1/019ed067-d54a-491d-96e4-ae33452ad482/program-preschool.jpg", "4-6 yrs", "10 weeks", "Beginner", 2999],
  ["stem", "stem-explorers", "STEM Explorers", "Hands-on experiments in physics, chemistry and engineering.", "/__l5e/assets-v1/cc2fe425-2b46-47e1-b442-8ea35ef1e8b5/program-stem.jpg", "7-12 yrs", "10 weeks", "Beginner", 4499],
  ["stem", "young-scientists", "Young Scientists", "Ask questions, test ideas and record results like a real scientist.", "/__l5e/assets-v1/cc2fe425-2b46-47e1-b442-8ea35ef1e8b5/program-stem.jpg", "8-13 yrs", "8 weeks", "Intermediate", 4499],
];

const MODULES = [
  { title: "Getting Started", position: 1, lessons: ["Welcome & safety basics", "Meet your tools", "Your first mini challenge"] },
  { title: "Core Concepts", position: 2, lessons: ["Key ideas explained", "Guided practice", "Debugging & improving"] },
  { title: "Build Your Project", position: 3, lessons: ["Plan your project", "Build and test", "Showcase & reflect"] },
];

const LESSON_VIDEOS = [
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
];
const LESSON_PDF = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

const PRODUCT_CATEGORIES = [
  { name: "Robotics Kits", slug: "robotics-kits", position: 1 },
  { name: "STEM Kits", slug: "stem-kits", position: 2 },
  { name: "Electronics Kits", slug: "electronics-kits", position: 3 },
  { name: "DIY Kits", slug: "diy-kits", position: 4 },
  { name: "Coding Kits", slug: "coding-kits", position: 5 },
  { name: "Accessories", slug: "accessories", position: 6 },
];

const PRODUCTS = [
  {
    cat: "robotics-kits", slug: "army-tank", name: "Army Tank",
    short: "Motorised tank with rotating turret and crawler treads.",
    descr: "Build a sturdy motorised tank with real crawler treads and a rotating turret. Learn gear ratios, torque and how tracked vehicles climb obstacles.",
    price: 2499, mrp: 3499, rating: 4.7, reviews: 128, age: "8+ yrs",
    img: "/__l5e/assets-v1/10c224a0-c2f6-4cdc-93a2-dcc50b167f90/product-army-tank.jpg",
    specs: { Pieces: "312", Power: "2 x AA (not included)", "Build time": "3-4 hours", Skill: "Intermediate" },
    box: ["312 building parts", "DC motor with gearbox", "Crawler treads", "Battery box", "Illustrated manual"],
    featured: true,
  },
  {
    cat: "robotics-kits", slug: "space-rover", name: "Space Rover",
    short: "Six-wheel rover with robotic arm and solar panel.",
    descr: "A six-wheeled planetary rover with a working robotic gripper and solar panel. Explore rocker-bogie suspension like real Mars rovers.",
    price: 2999, mrp: 4199, rating: 4.8, reviews: 96, age: "9+ yrs",
    img: "/__l5e/assets-v1/bcd0d147-4042-40dd-a34c-2e953d661ad0/product-space-rover.jpg",
    specs: { Pieces: "280", Power: "Solar + 2 x AA", "Build time": "3 hours", Skill: "Intermediate" },
    box: ["280 parts", "Solar panel", "2 motors", "Gripper assembly", "Manual & activity cards"],
    featured: true,
  },
  {
    cat: "stem-kits", slug: "machines-7-in-1-ultimate", name: "Machines 7-in-1 Ultimate",
    short: "Seven machines from one box: crane, windmill, car and more.",
    descr: "Build seven classic machines including a crane, windmill and racing car. Discover levers, pulleys, gears and wheels and axles.",
    price: 3499, mrp: 4999, rating: 4.9, reviews: 214, age: "7+ yrs",
    img: "/__l5e/assets-v1/fbacae74-e880-484d-95e0-282c2785df21/product-machines.jpg",
    specs: { Models: "7", Pieces: "420", "Build time": "1-2 hours per model", Skill: "Beginner" },
    box: ["420 parts", "Gear set", "Pulley set", "Tool kit", "7-model guide book"],
    featured: true,
  },
  {
    cat: "stem-kits", slug: "machines-3-in-1-explorer", name: "Machines 3-in-1 Explorer",
    short: "Three simple machines for curious young builders.",
    descr: "Three models in one kit — crane, car and windmill — designed for kids starting their engineering journey.",
    price: 1799, mrp: 2499, rating: 4.6, reviews: 88, age: "6+ yrs",
    img: "/__l5e/assets-v1/fbacae74-e880-484d-95e0-282c2785df21/product-machines.jpg",
    specs: { Models: "3", Pieces: "190", "Build time": "1 hour per model", Skill: "Beginner" },
    box: ["190 parts", "Gear set", "Tool kit", "Guide book"],
    featured: true,
  },
  {
    cat: "stem-kits", slug: "machines-3-in-1-starter", name: "Machines 3-in-1 Starter",
    short: "Perfect first kit with big, easy-grip parts.",
    descr: "Large, easy-grip parts and three playful models make this the ideal first engineering kit.",
    price: 1299, mrp: 1799, rating: 4.5, reviews: 64, age: "5+ yrs",
    img: "/__l5e/assets-v1/fbacae74-e880-484d-95e0-282c2785df21/product-machines.jpg",
    specs: { Models: "3", Pieces: "120", "Build time": "45 minutes per model", Skill: "Starter" },
    box: ["120 large parts", "Tool kit", "Picture guide"],
    featured: false,
  },
  {
    cat: "electronics-kits", slug: "accelero", name: "Accelero",
    short: "Build-your-own electronic racer with a programmable board.",
    descr: "A fast electronic racer with an exposed controller board. Learn circuits, motor drivers and speed control.",
    price: 1999, mrp: 2799, rating: 4.7, reviews: 102, age: "10+ yrs",
    img: "/__l5e/assets-v1/7d480dbf-911b-4ec4-ac5c-5e3447d4f109/product-accelero.jpg",
    specs: { Board: "Programmable controller", Power: "Rechargeable 3.7V pack", "Build time": "2 hours", Skill: "Intermediate" },
    box: ["Chassis & body", "Controller board", "DC motor", "Battery pack", "USB cable", "Manual"],
    featured: true,
  },
  {
    cat: "diy-kits", slug: "sextant", name: "Sextant",
    short: "Laser-cut wooden navigation instrument that really measures angles.",
    descr: "Assemble a working wooden sextant and learn how sailors navigated by the stars.",
    price: 1199, mrp: 1599, rating: 4.6, reviews: 41, age: "10+ yrs",
    img: "/__l5e/assets-v1/c9d6d67c-5608-4143-b15c-49859cd3ecb3/product-sextant.jpg",
    specs: { Material: "Laser-cut plywood", Pieces: "86", "Build time": "2 hours" },
    box: ["Wooden sheets", "Mirrors", "Eyepiece", "Fasteners", "Manual"],
    featured: false,
  },
  {
    cat: "diy-kits", slug: "telescope", name: "Telescope",
    short: "Wooden refracting telescope with real optics and tripod.",
    descr: "Build a working refracting telescope on a wooden tripod and observe the Moon and planets.",
    price: 1499, mrp: 2099, rating: 4.8, reviews: 77, age: "9+ yrs",
    img: "/__l5e/assets-v1/8596c465-1491-40b7-9c7d-271b84be176d/product-telescope.jpg",
    specs: { Magnification: "Up to 30x", Material: "Plywood + glass optics", "Build time": "2-3 hours" },
    box: ["Wooden sheets", "Objective lens", "Eyepiece", "Tripod parts", "Star chart"],
    featured: true,
  },
  {
    cat: "diy-kits", slug: "crossbow", name: "Crossbow",
    short: "Safe foam-dart wooden crossbow kit.",
    descr: "A safe, rubber-band powered wooden crossbow that fires foam darts. Learn about stored energy.",
    price: 899, mrp: 1299, rating: 4.5, reviews: 59, age: "8+ yrs",
    img: "/__l5e/assets-v1/6853fd49-f253-469c-8de3-72290cfee5ba/product-crossbow.jpg",
    specs: { Material: "Plywood", Darts: "5 foam darts", "Build time": "1 hour" },
    box: ["Wooden parts", "5 foam darts", "Rubber bands", "Manual"],
    featured: false,
  },
  {
    cat: "diy-kits", slug: "retroscope", name: "Retroscope",
    short: "Periscope + kaleidoscope optics kit.",
    descr: "Two optical toys in one kit — a periscope and a kaleidoscope — to explore reflection.",
    price: 999, mrp: 1399, rating: 4.4, reviews: 33, age: "7+ yrs",
    img: "/__l5e/assets-v1/08d1c873-7be9-488d-96fa-079c942a6215/product-retroscope.jpg",
    specs: { Material: "Plywood + mirrors", Models: "2", "Build time": "1.5 hours" },
    box: ["Wooden sheets", "3 mirrors", "Prism", "Colour chips", "Manual"],
    featured: false,
  },
  {
    cat: "coding-kits", slug: "sketching-machine", name: "Sketching Machine",
    short: "Motorised drawing robot you can program.",
    descr: "A motor-driven drawing robot that sketches spirals and patterns — and can be programmed with BixCode.",
    price: 2199, mrp: 2999, rating: 4.7, reviews: 52, age: "10+ yrs",
    img: "/__l5e/assets-v1/8c222e26-32f5-4758-b2d7-328a045887f4/product-sketching.jpg",
    specs: { Motors: "2 stepper motors", Programmable: "Yes (BixCode)", "Build time": "2-3 hours" },
    box: ["Wooden frame", "2 stepper motors", "Controller", "Pen holder", "Paper pad", "Manual"],
    featured: true,
  },
  {
    cat: "diy-kits", slug: "vintage-projector", name: "Vintage Projector",
    short: "Wooden film projector that shows real images.",
    descr: "Build a charming wooden projector that throws images onto your wall and learn how lenses focus light.",
    price: 1599, mrp: 2199, rating: 4.6, reviews: 47, age: "9+ yrs",
    img: "/__l5e/assets-v1/d7658ba4-68b5-44ed-be40-b8efcc854efc/product-projector.jpg",
    specs: { Material: "Plywood + lens", Light: "LED module", "Build time": "2 hours" },
    box: ["Wooden sheets", "Lens", "LED light", "Film strips", "Manual"],
    featured: false,
  },
  {
    cat: "diy-kits", slug: "guitar", name: "Guitar",
    short: "Playable 6-string wooden mini guitar.",
    descr: "Assemble and tune a playable mini guitar — a fun way to learn the science of sound.",
    price: 1099, mrp: 1499, rating: 4.5, reviews: 38, age: "8+ yrs",
    img: "/__l5e/assets-v1/a7f6f7fe-23b6-4835-b79a-f043fb121562/product-guitar.jpg",
    specs: { Strings: "6", Material: "Plywood", "Build time": "1.5 hours" },
    box: ["Wooden parts", "Strings", "Tuning pegs", "Bridge", "Manual"],
    featured: false,
  },
  {
    cat: "accessories", slug: "robotics-spare-parts-pack", name: "Robotics Spare Parts Pack",
    short: "Extra motors, wheels and connectors for your builds.",
    descr: "Keep building with spare motors, wheels, axles and connectors compatible with LearningBIX kits.",
    price: 499, mrp: 699, rating: 4.4, reviews: 25, age: "6+ yrs",
    img: "/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg",
    specs: { Includes: "Motors, wheels, connectors" },
    box: ["2 DC motors", "4 wheels", "Axles", "Connector pack"],
    featured: false,
  },
];

/** Deterministic stand-in for Postgres `hashtext(slug)`. */
function hashSlug(slug) {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

async function seed() {
  await connectDatabase();

  console.log("\nClearing existing catalogue...");
  await Promise.all([
    Lesson.deleteMany({}),
    CourseModule.deleteMany({}),
    Course.deleteMany({}),
    CourseCategory.deleteMany({}),
    StoreProduct.deleteMany({}),
    ProductCategory.deleteMany({}),
  ]);

  console.log("Seeding course categories...");
  const courseCategories = await CourseCategory.insertMany(COURSE_CATEGORIES);
  const courseCategoryBySlug = new Map(courseCategories.map((c) => [c.slug, c]));

  console.log("Seeding courses, modules and lessons...");
  let lessonCount = 0;
  for (const [catSlug, slug, title, short, image, age, duration, level, price] of COURSES) {
    const course = await Course.create({
      category_id: courseCategoryBySlug.get(catSlug)._id,
      slug,
      title,
      short_description: short,
      description:
        short +
        " Students learn through guided builds, weekly challenges and a final showcase project.",
      image_url: image,
      age_group: age,
      duration,
      level,
      price,
      is_published: true,
    });

    for (const module of MODULES) {
      const createdModule = await CourseModule.create({
        course_id: course._id,
        title: module.title,
        position: module.position,
      });

      const lessons = module.lessons.map((lessonTitle, index) => {
        const n = index + 1;
        return {
          course_id: course._id,
          module_id: createdModule._id,
          title: lessonTitle,
          content: `In this lesson of ${course.title} you will follow the video, try the activity on your own and note down what you discovered.`,
          video_url: LESSON_VIDEOS[index],
          pdf_url: n === 2 ? LESSON_PDF : undefined,
          duration_minutes: 10 + n * 5,
          duration_min: 10 + n * 5,
          position: n,
          order: n,
        };
      });

      await Lesson.insertMany(lessons);
      lessonCount += lessons.length;
    }
  }

  console.log("Seeding product categories...");
  const productCategories = await ProductCategory.insertMany(PRODUCT_CATEGORIES);
  const productCategoryBySlug = new Map(productCategories.map((c) => [c.slug, c]));

  console.log("Seeding products...");
  const products = PRODUCTS.map((p) => {
    const stock = 25 + (hashSlug(p.slug) % 75);
    return {
      category_id: productCategoryBySlug.get(p.cat)._id,
      category: p.cat,
      slug: p.slug,
      name: p.name,
      short_description: p.short,
      description: p.descr,
      price: p.price,
      mrp: p.mrp,
      rating: p.rating,
      reviews_count: p.reviews,
      age_group: p.age,
      image_url: p.img,
      specifications: p.specs,
      box_contents: p.box,
      images: [
        { url: p.img, position: 0 },
        { url: HERO_IMAGE, position: 1 },
      ],
      is_featured: p.featured,
      is_active: true,
      in_stock: stock > 0,
      stock,
    };
  });
  await StoreProduct.insertMany(products);

  const [courses, modules, lessons, stores] = await Promise.all([
    Course.countDocuments(),
    CourseModule.countDocuments(),
    Lesson.countDocuments(),
    StoreProduct.countDocuments(),
  ]);

  console.log("\nSeed complete:");
  console.log(`  course categories:  ${courseCategories.length}`);
  console.log(`  courses:            ${courses}`);
  console.log(`  course modules:     ${modules}`);
  console.log(`  lessons:            ${lessonCount} (in DB: ${lessons})`);
  console.log(`  product categories: ${productCategories.length}`);
  console.log(`  products:           ${stores}`);
}

seed()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\nSeed failed:", error.message);
    try {
      await mongoose.connection.close();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
