const { Course, CourseModule, Lesson, ProductCategory, StoreProduct } = require("../models");

const categoryOf = (value) => {
  if (!value || typeof value !== "object") return null;
  return { name: value.name, slug: value.slug };
};

const courseLite = (course) => ({
  id: String(course._id),
  slug: course.slug,
  title: course.title,
  short_description: course.short_description ?? null,
  image_url: course.image_url ?? null,
  age_group: course.age_group ?? null,
  duration: course.duration ?? null,
  level: course.level ?? "Beginner",
  price: course.price ?? 0,
  course_categories: categoryOf(course.category_id),
});

const productLite = (product) => ({
  id: String(product._id),
  slug: product.slug,
  name: product.name,
  short_description: product.short_description ?? null,
  price: product.price ?? 0,
  mrp: product.mrp ?? product.price ?? 0,
  rating: product.rating ?? 0,
  reviews_count: product.reviews_count ?? 0,
  age_group: product.age_group ?? null,
  image_url: product.image_url ?? null,
  is_featured: Boolean(product.is_featured),
  created_at: (product.createdAt || product._id.getTimestamp()).toISOString(),
  product_categories: categoryOf(product.category_id),
});

exports.listCourses = async (req, res, next) => {
  try {
    const filter = { is_published: { $ne: false } };
    const courses = await Course.find(filter).populate("category_id").sort("price").lean();

    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const list = courses
      .map(courseLite)
      .filter((course) => !category || course.course_categories?.slug === category);

    return res.json(list);
  } catch (error) {
    return next(error);
  }
};

exports.getCourse = async (req, res, next) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug, is_published: { $ne: false } })
      .populate("category_id")
      .lean();
    if (!course) return res.status(404).json({ message: "Course not found" });

    const modules = await CourseModule.find({ course_id: course._id }).sort("position").lean();
    const lessons = await Lesson.find({ module_id: { $in: modules.map((m) => m._id) } })
      .sort("position")
      .lean();

    const lessonsByModule = new Map();
    for (const lesson of lessons) {
      const key = String(lesson.module_id);
      if (!lessonsByModule.has(key)) lessonsByModule.set(key, []);
      lessonsByModule.get(key).push({
        id: String(lesson._id),
        title: lesson.title,
        duration_minutes: lesson.duration_minutes ?? lesson.duration_min ?? null,
        position: lesson.position ?? lesson.order ?? 0,
      });
    }

    return res.json({
      ...courseLite(course),
      description: course.description ?? null,
      course_modules: modules.map((module) => ({
        id: String(module._id),
        title: module.title,
        position: module.position ?? 0,
        lessons: lessonsByModule.get(String(module._id)) ?? [],
      })),
    });
  } catch (error) {
    return next(error);
  }
};

exports.listProducts = async (req, res, next) => {
  try {
    const filter = { is_active: { $ne: false } };
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const [products, categories] = await Promise.all([
      StoreProduct.find(filter).populate("category_id").sort("createdAt").lean(),
      ProductCategory.find().sort("position").lean(),
    ]);

    return res.json({
      products: products
        .map(productLite)
        .filter((product) => !category || product.product_categories?.slug === category),
      categories: categories.map((c) => ({ name: c.name, slug: c.slug })),
    });
  } catch (error) {
    return next(error);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const product = await StoreProduct.findOne({ slug: req.params.slug, is_active: { $ne: false } })
      .populate("category_id")
      .lean();
    if (!product) return res.json({ product: null, related: [] });

    const relatedFilter = { _id: { $ne: product._id }, is_active: { $ne: false } };
    let related = product.category_id
      ? await StoreProduct.find({ ...relatedFilter, category_id: product.category_id._id })
          .populate("category_id")
          .limit(4)
          .lean()
      : [];

    if (related.length < 4) {
      const more = await StoreProduct.find({ ...relatedFilter, is_featured: true })
        .populate("category_id")
        .limit(4)
        .lean();
      const seen = new Set(related.map((r) => String(r._id)));
      related = [...related, ...more.filter((m) => !seen.has(String(m._id)))].slice(0, 4);
    }

    const images = Array.isArray(product.images) && product.images.length
      ? [...product.images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      : product.image_url
        ? [{ url: product.image_url, position: 0 }]
        : [];

    return res.json({
      product: {
        ...productLite(product),
        description: product.description ?? null,
        specifications:
          product.specifications && typeof product.specifications === "object" ? product.specifications : {},
        box_contents: Array.isArray(product.box_contents) ? product.box_contents : [],
        product_images: images,
        inventory: { stock: product.stock ?? 0 },
      },
      related: related.map(productLite),
    });
  } catch (error) {
    return next(error);
  }
};
