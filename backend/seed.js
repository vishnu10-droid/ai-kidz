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
const bcrypt = require("bcryptjs");
const { connectDatabase } = require("./config/db");
const {
  User,
  School,
  Franchise,
  Teacher,
  Student,
  Parent,
  Batch,
  Enrollment,
  LessonProgress,
  AttendanceRecord,
  FeeInvoice,
  Assignment,
  AssignmentSubmission,
  Quiz,
  QuizSubmission,
  Notification,
  LiveSession,
  DiyKitGuide,
  Order,
  OrderItem,
  Enquiry,
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
  ["robotics", "beginner-robotics", "Robotics Starter Kit", "Build your first moving robot with motors, wheels and simple logic.", "/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg", "6-9 yrs", "8 weeks", "Beginner", 4999],
  ["robotics", "intermediate-robotics", "Intermediate Robotics", "Program sensors and make robots react to light, sound and obstacles.", "/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg", "9-12 yrs", "10 weeks", "Intermediate", 6999],
  ["robotics", "advanced-robotics", "Advanced Robotics", "Design autonomous robots with microcontrollers and multi-sensor logic.", "/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg", "12-16 yrs", "12 weeks", "Advanced", 8999],
  ["robotics", "electronics-basics", "Electronics", "Circuits, LEDs, resistors and breadboards explained through mini builds.", "/__l5e/assets-v1/cc2fe425-2b46-47e1-b442-8ea35ef1e8b5/program-stem.jpg", "8-12 yrs", "6 weeks", "Beginner", 3999],
  ["robotics", "sensors-and-motors", "Sensors and Motors", "Servo, DC and stepper motors plus ultrasonic, IR and touch sensors.", "/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg", "10-14 yrs", "8 weeks", "Intermediate", 5499],
  ["robotics", "iot-and-electronics", "IoT and Electronics", "Connect devices to the internet and build a smart home model.", "/__l5e/assets-v1/cc2fe425-2b46-47e1-b442-8ea35ef1e8b5/program-stem.jpg", "11-16 yrs", "10 weeks", "Intermediate", 6999],
  ["robotics", "automation", "Automation", "Conveyor belts, sorting machines and automatic doors with code.", "/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg", "12-16 yrs", "8 weeks", "Advanced", 6499],
  ["coding", "scratch-coding", "Block Coding with Scratch", "Create animations, stories and games with drag-and-drop blocks.", "/__l5e/assets-v1/eeff49ac-ae71-4a82-b2a3-3cdeab4ca080/program-coding.jpg", "6-10 yrs", "8 weeks", "Beginner", 3999],
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

  console.log("\nClearing existing catalogue and demo data...");
  await Promise.all([
    Lesson.deleteMany({}),
    CourseModule.deleteMany({}),
    Course.deleteMany({}),
    CourseCategory.deleteMany({}),
    StoreProduct.deleteMany({}),
    ProductCategory.deleteMany({}),
    LessonProgress.deleteMany({}),
    QuizSubmission.deleteMany({}),
    Quiz.deleteMany({}),
    AssignmentSubmission.deleteMany({}),
    Assignment.deleteMany({}),
    AttendanceRecord.deleteMany({}),
    FeeInvoice.deleteMany({}),
    Enrollment.deleteMany({}),
    Student.deleteMany({}),
    Parent.deleteMany({}),
    Batch.deleteMany({}),
    Teacher.deleteMany({}),
    School.deleteMany({}),
    Franchise.deleteMany({}),
    Notification.deleteMany({}),
    LiveSession.deleteMany({}),
    DiyKitGuide.deleteMany({}),
    Enquiry.deleteMany({}),
    OrderItem.deleteMany({}),
    Order.deleteMany({}),
    User.deleteMany({}),
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

  /* ======================================================================
   * Demo accounts and activity so every dashboard opens with real content.
   * ==================================================================== */

  console.log("\nSeeding demo accounts and dashboards...");

  const hash = (value) => bcrypt.hash(value, 10);
  const at = (days, hour = 10) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    return date;
  };

  const [
    adminUser,
    schoolUser,
    franchiseUser,
    teacherUser,
    teacherUser2,
    teacherUser3,
    parentUser,
    studentUser,
  ] = await Promise.all([
    User.create({ email: "admin@aikidz.com", full_name: "Aarav Mehta", password: await hash("Admin@123"), roles: ["admin"], phone: "9800000001", city: "New Delhi" }),
    User.create({ email: "school@aikidz.com", full_name: "Priya Sharma", password: await hash("School@123"), roles: ["school_admin"], phone: "9800000002", city: "New Delhi" }),
    User.create({ email: "franchise@aikidz.com", full_name: "Rohan Kapoor", password: await hash("Franchise@123"), roles: ["franchise"], phone: "9800000003", city: "Noida" }),
    User.create({ email: "teacher@aikidz.com", full_name: "Neha Verma", password: await hash("Teacher@123"), roles: ["teacher"], phone: "9800000004", city: "New Delhi" }),
    User.create({ email: "teacher2@aikidz.com", full_name: "Vikram Singh", password: await hash("Teacher@123"), roles: ["teacher"], phone: "9800000005", city: "New Delhi" }),
    User.create({ email: "anjali@aikidz.com", full_name: "Anjali Deshmukh", password: await hash("Teacher@123"), roles: ["teacher"], phone: "9800000008", city: "Noida" }),
    User.create({ email: "parent@aikidz.com", full_name: "Sandeep Gupta", password: await hash("Parent@123"), roles: ["parent"], phone: "9800000006", city: "New Delhi" }),
    User.create({ email: "student@aikidz.com", full_name: "Ishaan Gupta", password: await hash("Student@123"), roles: ["student"], phone: "9800000007", city: "New Delhi" }),
  ]);

  const school = await School.create({
    name: "Delhi Public AI School",
    code: "DPS-AI-01",
    address: "12, Robotics Lane, Sector 21",
    city: "New Delhi",
    state: "Delhi",
    contact_email: "school@aikidz.com",
    contact_phone: "011-4567-8900",
    lab_status: "active",
    status: "active",
    owner_id: schoolUser._id,
  });

  const franchise = await Franchise.create({
    name: "AIKIDZ Noida Centre",
    code: "FRN-NOI-01",
    address: "B-14, Sector 62",
    city: "Noida",
    state: "Uttar Pradesh",
    territory: "Noida & Greater Noida",
    contact_email: "franchise@aikidz.com",
    contact_phone: "0120-456-7890",
    revenue_share: 70,
    status: "active",
    owner_id: franchiseUser._id,
  });

  const [teacher, teacher2] = await Promise.all([
    Teacher.create({ user_id: teacherUser._id, school_id: school._id, full_name: "Neha Verma", email: "teacher@aikidz.com", phone: "9800000004", subject: "Robotics", specialization: "Robotics & Electronics" }),
    Teacher.create({ user_id: teacherUser2._id, school_id: school._id, full_name: "Vikram Singh", email: "teacher2@aikidz.com", phone: "9800000005", subject: "Coding", specialization: "Python & Game Design" }),
  ]);

  const franchiseTeacher = await Teacher.create({
    user_id: teacherUser3._id,
    franchise_id: franchise._id,
    full_name: "Anjali Deshmukh",
    email: "anjali@aikidz.com",
    phone: "9800000008",
    subject: "Robotics & AI",
    specialization: "Early-years STEM",
  });

  const [roboticsBatch, codingBatch, franchiseBatch] = await Promise.all([
    Batch.create({ name: "Robotics Batch A", grade: "Grade 6", school_id: school._id, teacher_id: teacher._id, schedule: "Mon & Wed · 10:00 AM", room: "Lab 1" }),
    Batch.create({ name: "Coding Batch B", grade: "Grade 7", school_id: school._id, teacher_id: teacher2._id, schedule: "Tue & Thu · 11:30 AM", room: "Lab 2" }),
    Batch.create({ name: "Noida Weekend Batch", grade: "Grade 5", franchise_id: franchise._id, teacher_id: franchiseTeacher._id, schedule: "Sat · 9:00 AM", room: "Centre Hall" }),
  ]);

  const parent = await Parent.create({
    user_id: parentUser._id,
    full_name: "Sandeep Gupta",
    email: "parent@aikidz.com",
    phone: "9800000006",
  });

  const students = await Student.insertMany([
    { user_id: studentUser._id, school_id: school._id, batch_id: roboticsBatch._id, parent_id: parent._id, full_name: "Ishaan Gupta", roll_number: "RBT-A-001", email: "student@aikidz.com", grade: "Grade 6", age: 11 },
    { school_id: school._id, batch_id: roboticsBatch._id, full_name: "Ananya Rao", roll_number: "RBT-A-002", email: "ananya@example.com", grade: "Grade 6", age: 11 },
    { school_id: school._id, batch_id: roboticsBatch._id, full_name: "Kabir Nair", roll_number: "RBT-A-003", email: "kabir@example.com", grade: "Grade 6", age: 12 },
    { school_id: school._id, batch_id: roboticsBatch._id, full_name: "Meera Joshi", roll_number: "RBT-A-004", email: "meera@example.com", grade: "Grade 6", age: 11 },
    { school_id: school._id, batch_id: roboticsBatch._id, full_name: "Arjun Sethi", roll_number: "RBT-A-005", email: "arjun@example.com", grade: "Grade 6", age: 12 },
  ]);
  const mainStudent = students[0];

  // Students enrolled at the Noida centre so the franchise dashboard is populated too.
  const franchiseStudents = await Student.insertMany([
    { franchise_id: franchise._id, batch_id: franchiseBatch._id, parent_id: parent._id, full_name: "Advika Gupta", roll_number: "NOI-W-001", email: "advika@example.com", grade: "Grade 5", age: 10 },
    { franchise_id: franchise._id, batch_id: franchiseBatch._id, full_name: "Vivaan Khanna", roll_number: "NOI-W-002", email: "vivaan@example.com", grade: "Grade 5", age: 10 },
    { franchise_id: franchise._id, batch_id: franchiseBatch._id, full_name: "Sara Ali", roll_number: "NOI-W-003", email: "sara@example.com", grade: "Grade 5", age: 11 },
  ]);

  // Attendance for the last 7 days across the Robotics batch.
  const attendanceDocs = [];
  for (let day = 0; day < 7; day += 1) {
    students.forEach((student, index) => {
      const status = (day + index) % 7 === 3 ? "absent" : (day + index) % 9 === 5 ? "late" : "present";
      attendanceDocs.push({
        student_id: student._id,
        batch_id: roboticsBatch._id,
        date: at(-day, 9),
        status,
        marked_by: teacherUser._id,
      });
    });
    franchiseStudents.forEach((student, index) => {
      const status = (day + index) % 6 === 2 ? "absent" : (day + index) % 8 === 5 ? "late" : "present";
      attendanceDocs.push({
        student_id: student._id,
        batch_id: franchiseBatch._id,
        date: at(-day, 10),
        status,
        marked_by: teacherUser3._id,
      });
    });
  }
  await AttendanceRecord.insertMany(attendanceDocs);

  // Three school invoices (one paid, two pending) plus centre invoices so the
  // franchise revenue tab and revenue-share split show real numbers.
  await FeeInvoice.insertMany([
    { school_id: school._id, student_id: mainStudent._id, title: "Term 1 Lab Fee", amount: 8000, due_date: at(-20), status: "paid", paid_at: at(-18), method: "upi", receipt_number: "RCP-DEMO-001" },
    { school_id: school._id, student_id: mainStudent._id, title: "Term 2 Lab Fee", amount: 8000, due_date: at(10), status: "pending", receipt_number: "INV-DEMO-002" },
    { school_id: school._id, student_id: mainStudent._id, title: "Annual Activity Fee", amount: 2500, due_date: at(20), status: "pending", receipt_number: "INV-DEMO-003" },
    { franchise_id: franchise._id, student_id: franchiseStudents[0]._id, title: "Centre Term Fee", amount: 6500, due_date: at(-48), status: "paid", paid_at: at(-45), method: "upi", receipt_number: "RCP-NOI-001" },
    { franchise_id: franchise._id, student_id: franchiseStudents[0]._id, title: "Robotics Kit Fee", amount: 3500, due_date: at(-14), status: "paid", paid_at: at(-12), method: "card", receipt_number: "RCP-NOI-002" },
    { franchise_id: franchise._id, student_id: franchiseStudents[1]._id, title: "Centre Term Fee", amount: 6500, due_date: at(14), status: "pending", receipt_number: "INV-NOI-003" },
  ]);

  const [lineFollower, motorWiring, obstacleVideo] = await Promise.all([
    Assignment.create({ batch_id: roboticsBatch._id, teacher_id: teacher._id, title: "Build a line-follower robot", description: "Assemble the chassis, wire the IR sensors and submit a short video of your robot following a black line.", due_date: at(3), max_marks: 100 }),
    Assignment.create({ batch_id: roboticsBatch._id, teacher_id: teacher._id, title: "Motor wiring & driver test", description: "Wire both BO motors to the L298N driver, test forward/reverse and upload your wiring notes.", due_date: at(-7), max_marks: 100 }),
    Assignment.create({ batch_id: roboticsBatch._id, teacher_id: teacher._id, title: "Upload Obstacle Avoider Video", description: "Record a 60-second clip of your obstacle avoiding robot navigating a small course. Show the ultrasonic sensor triggering a turn.", due_date: at(4), max_marks: 100 }),
  ]);

  await AssignmentSubmission.insertMany([
    {
      assignment_id: motorWiring._id,
      student_id: mainStudent._id,
      content: "Both motors wired through the L298N driver. Forward, reverse and pivot turns tested on the bench.",
      project_url: "https://drive.google.com/file/d/aikidz-motor-wiring-demo",
      status: "graded",
      marks: 92,
      feedback: "Excellent motor wiring!",
      submitted_at: at(-8),
    },
    {
      assignment_id: lineFollower._id,
      student_id: mainStudent._id,
      content: "My robot follows the line and stops at obstacles. Video link attached.",
      file_url: "https://example.com/line-follower-video",
      status: "submitted",
      submitted_at: at(-1),
    },
    { assignment_id: lineFollower._id, student_id: students[1]._id, content: "Chassis built, sensors wired, testing in progress.", status: "submitted", submitted_at: at(-1) },
    { assignment_id: lineFollower._id, student_id: students[2]._id, content: "Robot follows the line but turns slightly wide on curves.", status: "submitted", submitted_at: at(-2) },
  ]);

  // The starter kit is an 8-lesson course so 6 completed lessons display as 75%.
  const starterCourse = await Course.findOne({ slug: "beginner-robotics" }).lean();
  if (starterCourse) {
    const extraLesson = await Lesson.findOne({ course_id: starterCourse._id })
      .sort({ position: -1, order: -1, _id: -1 })
      .lean();
    if (extraLesson) {
      await Lesson.deleteOne({ _id: extraLesson._id });
      lessonCount -= 1;
    }
  }

  const demoCourseSlugs = ["beginner-robotics", "scratch-coding"];
  const demoCourses = await Course.find({ slug: { $in: demoCourseSlugs } }).lean();
  const courseBySlug = new Map(demoCourses.map((course) => [course.slug, course]));

  const enrollmentProgress = { "beginner-robotics": 0.75, "scratch-coding": 1 };
  const demoMirror = [];
  for (const slug of demoCourseSlugs) {
    const course = courseBySlug.get(slug);
    if (!course) continue;
    const lessons = await Lesson.find({ course_id: course._id }).sort({ position: 1 }).lean();
    const completeCount = Math.round(lessons.length * enrollmentProgress[slug]);
    const completed = lessons.slice(0, completeCount);
    const progress = lessons.length ? Math.round((completeCount / lessons.length) * 100) : 0;
    const completedAt = progress >= 100 ? at(-6) : undefined;
    await Enrollment.create({
      student_id: mainStudent._id,
      course_id: course._id,
      batch_id: roboticsBatch._id,
      progress,
      status: progress >= 100 ? "completed" : "active",
      completed_lessons: completed.map((lesson) => lesson._id),
      enrolled_at: at(-30),
    });
    if (completed.length) {
      await LessonProgress.insertMany(
        completed.map((lesson) => ({
          student_id: mainStudent._id,
          course_id: course._id,
          lesson_id: lesson._id,
          completed_at: at(-10),
        })),
      );
    }
    demoMirror.push({
      courseId: course._id,
      completedLessons: completed.map((lesson) => String(lesson._id)),
      progressPercentage: progress,
      ...(completedAt ? { completedAt } : {}),
      ...(slug === "scratch-coding" ? { certificateId: "AKZ-CERT-SCR1X" } : {}),
    });
  }

  // Gamification: 240 XP, a 4-day streak, "Robo Builder" rank and two badges.
  await Student.updateOne(
    { _id: mainStudent._id },
    {
      $set: {
        xpPoints: 240,
        streakDays: 4,
        lastActiveDate: new Date(),
        rankTitle: "Robo Builder",
        badges: [
          { badgeId: "first-robot-built", title: "First Robot Built", icon: "first-circuit", unlockedAt: at(-18) },
          { badgeId: "sensor-master", title: "Sensor Master", icon: "sensor-master", unlockedAt: at(-9) },
        ],
        enrolledCourses: demoMirror,
      },
    },
  );

  // Enroll the rest of the batch in the beginner course at varied progress.
  const beginner = courseBySlug.get("beginner-robotics");
  if (beginner) {
    const beginnerLessons = await Lesson.find({ course_id: beginner._id }).sort({ position: 1 }).lean();
    for (const [index, student] of students.slice(1).entries()) {
      const completeCount = Math.min(beginnerLessons.length, 2 + index);
      await Enrollment.create({
        student_id: student._id,
        course_id: beginner._id,
        batch_id: roboticsBatch._id,
        progress: beginnerLessons.length ? Math.round((completeCount / beginnerLessons.length) * 100) : 0,
        completed_lessons: beginnerLessons.slice(0, completeCount).map((lesson) => lesson._id),
      });
    }
  }

  const quiz = await Quiz.create({
    course_id: beginner?._id,
    title: "Robotics Basics Quiz",
    description: "A quick check on motors, sensors and safe building.",
    questions: [
      { question: "Which component makes a robot move?", options: ["Battery", "Motor", "LED", "Switch"], correct_index: 1 },
      { question: "What does an IR sensor detect?", options: ["Sound", "Light & obstacles", "Temperature", "Humidity"], correct_index: 1 },
      { question: "What is the brain of a robot?", options: ["Wheel", "Chassis", "Microcontroller", "Servo"], correct_index: 2 },
      { question: "Why do we use a resistor with an LED?", options: ["To limit current", "To make it brighter", "To store power", "To change colour"], correct_index: 0 },
    ],
  });
  await QuizSubmission.create({ student_id: mainStudent._id, quiz_id: quiz._id, answers: [1, 1, 2, 2], score: 75, passed: true });

  // Upcoming live classes so the student hub shows the "LIVE" schedule.
  await LiveSession.create({
    title: "Sensors & Actuators Deep Dive",
    batchId: roboticsBatch._id,
    teacherId: teacherUser._id,
    meetingUrl: "https://meet.google.com/aikidz-sensors",
    startTime: at(1, 10),
    endTime: at(1, 11),
    topic: "How IR and ultrasonic sensors talk to motors",
    status: "upcoming",
  });
  await LiveSession.create({
    title: "Line Following Robot Workshop",
    batchId: roboticsBatch._id,
    teacherId: teacherUser._id,
    meetingUrl: "https://meet.google.com/aikidz-line-follower",
    startTime: at(2, 16),
    endTime: at(2, 17),
    topic: "Calibrate the IR array and tune your PID values live",
    status: "upcoming",
  });

  // Two DIY guides for the Robotics Lab tab.
  await DiyKitGuide.insertMany([
    {
      title: "Obstacle Avoiding Robot with Ultrasonic Sensor",
      kitType: "RoboKit Level 1",
      difficulty: "Medium",
      componentsNeeded: [
        "Arduino Uno R3",
        "HC-SR04 Ultrasonic Sensor",
        "L298N Motor Driver",
        "2 × BO Motors with wheels",
        "9V Battery + snap connector",
        "Breadboard & jumper wires",
        "Robot chassis",
      ],
      circuitDiagramUrl: "/__l5e/assets-v1/ef93305e-d966-4246-a49b-f0132f41791e/program-robotics.jpg",
      codeSnippet: [
        "const int trigPin = 9;",
        "const int echoPin = 10;",
        "const int leftMotor = 5;",
        "const int rightMotor = 6;",
        "",
        "long readDistance() {",
        "  digitalWrite(trigPin, LOW); delayMicroseconds(2);",
        "  digitalWrite(trigPin, HIGH); delayMicroseconds(10);",
        "  digitalWrite(trigPin, LOW);",
        "  long duration = pulseIn(echoPin, HIGH);",
        "  return duration * 0.034 / 2;",
        "}",
        "",
        "void setup() {",
        "  pinMode(trigPin, OUTPUT); pinMode(echoPin, INPUT);",
        "  pinMode(leftMotor, OUTPUT); pinMode(rightMotor, OUTPUT);",
        "}",
        "",
        "void loop() {",
        "  if (readDistance() < 20) {",
        "    digitalWrite(leftMotor, LOW);  // stop",
        "    digitalWrite(rightMotor, HIGH); // turn right",
        "    delay(400);",
        "  } else {",
        "    digitalWrite(leftMotor, HIGH);",
        "    digitalWrite(rightMotor, HIGH);",
        "  }",
        "}",
      ].join("\n"),
      troubleshootingSteps: [
        "Robot spins in circles: swap the two wires of one motor at the L298N output.",
        "Distance always reads 0: check that trig is on pin 9 and echo on pin 10, then reseat the jumper wires.",
        "Motors jitter or the Arduino restarts: power the motors from a separate battery pack and join the grounds.",
        "Robot reacts too late: lower the 20 cm threshold or mount the sensor higher on the chassis.",
      ],
    },
    {
      title: "Smart Home Light with PIR Motion Sensor",
      kitType: "Home Automation Kit",
      difficulty: "Easy",
      componentsNeeded: [
        "Arduino Nano",
        "PIR Motion Sensor (HC-SR501)",
        "5V Relay Module",
        "LED bulb + holder",
        "Breadboard",
        "Jumper wires",
        "5V USB power supply",
      ],
      circuitDiagramUrl: "/__l5e/assets-v1/cc2fe425-2b46-47e1-b442-8ea35ef1e8b5/program-stem.jpg",
      codeSnippet: [
        "const int pirPin = 2;",
        "const int relayPin = 7;",
        "",
        "void setup() {",
        "  pinMode(pirPin, INPUT);",
        "  pinMode(relayPin, OUTPUT);",
        "  digitalWrite(relayPin, HIGH); // relay off",
        "  Serial.begin(9600);",
        "}",
        "",
        "void loop() {",
        "  if (digitalRead(pirPin) == HIGH) {",
        "    digitalWrite(relayPin, LOW); // light on",
        "    Serial.println(\"Motion detected — light on\");",
        "    delay(10000);",
        "  } else {",
        "    digitalWrite(relayPin, HIGH);",
        "  }",
        "}",
      ].join("\n"),
      troubleshootingSteps: [
        "Light stays on all the time: turn the sensitivity potentiometer on the PIR anticlockwise.",
        "No trigger at all: wait 60 seconds after power-up while the PIR sensor calibrates.",
        "Relay clicks but the bulb does not light: check the bulb holder and the relay's COM/NO terminals.",
        "False triggers near windows: reduce sensitivity and keep the sensor away from direct sunlight.",
      ],
    },
  ]);

  // Store orders with items.
  const storeProducts = await StoreProduct.find().limit(6).lean();
  const orderSeeds = [
    { number: "ORD-1001", customer: "Sandeep Gupta", email: "parent@aikidz.com", status: "delivered", payment: "paid", days: -12, picks: [0, 1] },
    { number: "ORD-1002", customer: "Ananya Rao", email: "ananya@example.com", status: "shipped", payment: "paid", days: -5, picks: [2] },
    { number: "ORD-1003", customer: "Kabir Nair", email: "kabir@example.com", status: "confirmed", payment: "pending", days: -2, picks: [3, 4] },
    { number: "ORD-1004", customer: "Priya Sharma", email: "school@aikidz.com", status: "packed", payment: "paid", days: -1, picks: [5] },
  ];
  for (const seedOrder of orderSeeds) {
    const picks = seedOrder.picks.map((i) => storeProducts[i % storeProducts.length]).filter(Boolean);
    const total = picks.reduce((sum, product) => sum + Number(product.price || 0), 0);
    const order = await Order.create({
      order_number: seedOrder.number,
      customer_name: seedOrder.customer,
      customer_email: seedOrder.email,
      total,
      status: seedOrder.status,
      payment_status: seedOrder.payment,
      placed_at: at(seedOrder.days, 14),
    });
    await OrderItem.insertMany(
      picks.map((product) => ({ order_id: order._id, product_id: product._id, name: product.name, price: product.price, quantity: 1 })),
    );
  }

  await Enquiry.insertMany([
    { name: "Ritika Malhotra", email: "ritika@example.com", phone: "9812345670", city: "New Delhi", subject: "Robotics for my 9-year-old", message: "Do you have weekend batches near Sector 21?", status: "new", source: "website" },
    { name: "Amit Bose", email: "amit@example.com", phone: "9812345671", city: "Noida", subject: "Franchise enquiry", message: "I would like to open an AIKIDZ centre in Indirapuram.", status: "contacted", source: "franchise-form", franchise_id: franchise._id },
    { name: "Sunita Rao", email: "sunita@example.com", phone: "9812345672", city: "Noida", subject: "Summer camp details", message: "Please share the summer camp schedule and fees.", status: "follow_up", source: "website", franchise_id: franchise._id },
    { name: "Deepak Jain", email: "deepak@example.com", phone: "9812345673", city: "New Delhi", subject: "School partnership", message: "We are a CBSE school interested in a robotics lab.", status: "new", source: "school-form", school_id: school._id },
    { name: "Fatima Khan", email: "fatima@example.com", phone: "9812345674", city: "New Delhi", subject: "Fee structure", message: "What is the fee for the beginner robotics course?", status: "converted", source: "website" },
  ]);

  await Notification.insertMany([
    { user_id: studentUser._id, title: "Assignment graded", message: "Motor wiring & driver test · 92/100. Excellent motor wiring!", link: "/student/assignments" },
    { user_id: studentUser._id, title: "Live class tomorrow", message: "Sensors & Actuators Deep Dive · 10:00 AM with Neha Verma.", link: "/student/dashboard?tab=live" },
    { user_id: studentUser._id, title: "New quiz available", message: "Robotics Basics Quiz is now open.", link: "/student/quizzes" },
    { user_id: parentUser._id, title: "Fee due soon", message: "Term 2 Lab Fee of Rs 8,000 is due in 10 days.", link: "/parent/dashboard" },
    { user_id: teacherUser._id, title: "New submission", message: "Ishaan Gupta submitted Build a line-follower robot.", link: "/teacher/dashboard" },
    { user_id: schoolUser._id, title: "Attendance saved", message: "Robotics Batch A attendance is up to date.", link: "/school/dashboard?tab=attendance" },
    { user_id: franchiseUser._id, title: "New centre enquiry", message: "Sunita Rao asked about the Noida summer camp schedule.", link: "/franchise/dashboard?tab=enquiries" },
    { user_id: adminUser._id, title: "New franchise enquiry", message: "Amit Bose wants to open a centre in Indirapuram.", link: "/admin/enquiries" },
  ]);


  const [courses, modules, lessons, stores, users, demoStudents, demoSchools, demoBatches, demoFees, demoAttendance, demoOrders, demoEnquiries] =
    await Promise.all([
      Course.countDocuments(),
      CourseModule.countDocuments(),
      Lesson.countDocuments(),
      StoreProduct.countDocuments(),
      User.countDocuments(),
      Student.countDocuments(),
      School.countDocuments(),
      Batch.countDocuments(),
      FeeInvoice.countDocuments(),
      AttendanceRecord.countDocuments(),
      Order.countDocuments(),
      Enquiry.countDocuments(),
    ]);

  console.log("\nSeed complete:");
  console.log(`  course categories:  ${courseCategories.length}`);
  console.log(`  courses:            ${courses}`);
  console.log(`  course modules:     ${modules}`);
  console.log(`  lessons:            ${lessonCount} (in DB: ${lessons})`);
  console.log(`  product categories: ${productCategories.length}`);
  console.log(`  products:           ${stores}`);
  console.log(`  users:              ${users}`);
  console.log(`  schools:            ${demoSchools}`);
  console.log(`  students:           ${demoStudents}`);
  console.log(`  batches:            ${demoBatches}`);
  console.log(`  attendance records: ${demoAttendance}`);
  console.log(`  fee invoices:       ${demoFees}`);
  console.log(`  orders:             ${demoOrders}`);
  console.log(`  enquiries:          ${demoEnquiries}`);
  console.log("\nDemo logins:");
  console.log("  admin@aikidz.com     / Admin@123");
  console.log("  school@aikidz.com    / School@123");
  console.log("  franchise@aikidz.com / Franchise@123");
  console.log("  teacher@aikidz.com   / Teacher@123");
  console.log("  parent@aikidz.com    / Parent@123");
  console.log("  student@aikidz.com   / Student@123");
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
