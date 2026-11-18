const { BlogPost } = require("../models");

const blogLite = (post) => ({
  id: String(post._id),
  slug: post.slug,
  title: post.title,
  excerpt: post.excerpt ?? null,
  cover_image: post.cover_image ?? null,
  category: post.category ?? "News",
  author: post.author ?? "AIKIDZ Team",
  tags: post.tags ?? [],
  published_at: (post.published_at || post.createdAt || new Date()).toISOString(),
  read_minutes: post.read_minutes ?? 4,
  views: post.views ?? 0,
});

/** GET /api/blogs — published posts plus the categories in use. */
exports.listBlogs = async (_req, res, next) => {
  try {
    const posts = await BlogPost.find({ is_published: { $ne: false } })
      .sort("-published_at")
      .lean();
    const categories = [...new Set(posts.map((post) => post.category || "News"))].sort();
    return res.json({ posts: posts.map(blogLite), categories });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/blogs/:slug — full article, related posts and a view bump. */
exports.getBlog = async (req, res, next) => {
  try {
    const post = await BlogPost.findOne({ slug: req.params.slug, is_published: { $ne: false } }).lean();
    if (!post) return res.json({ post: null, related: [] });

    await BlogPost.updateOne({ _id: post._id }, { $inc: { views: 1 } });

    const related = await BlogPost.find({
      is_published: { $ne: false },
      _id: { $ne: post._id },
      $or: [{ category: post.category }, { tags: { $in: post.tags ?? [] } }],
    })
      .sort("-published_at")
      .limit(3)
      .lean();

    return res.json({
      post: {
        ...blogLite(post),
        content: post.content ?? "",
        views: (post.views ?? 0) + 1,
      },
      related: related.map(blogLite),
    });
  } catch (error) {
    return next(error);
  }
};
