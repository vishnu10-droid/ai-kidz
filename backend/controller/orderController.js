const { Order, OrderItem, StoreProduct, User } = require("../models");
const { withId, withIds } = require("./helpers");

const FREE_SHIPPING_THRESHOLD = 999;
const SHIPPING_FEE = 79;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Orders are matched to the signed-in user by email (the store captures no account link). */
async function findMine(req) {
  const user = await User.findById(req.user.id).select("email").lean();
  const email = String(user?.email || "").toLowerCase();
  if (!email) return [];
  return Order.find({ customer_email: new RegExp(`^${escapeRegex(email)}$`, "i") }).sort("-createdAt").lean();
}

async function withItems(orders) {
  if (orders.length === 0) return [];
  const items = await OrderItem.find({ order_id: { $in: orders.map((order) => order._id) } }).lean();
  return orders.map((order) => ({
    ...withId(order),
    items: withIds(items.filter((item) => String(item.order_id) === String(order._id))),
  }));
}

async function nextOrderNumber() {
  const count = await Order.countDocuments();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const orderNumber = `ORD-${1001 + count + attempt}`;
    if (!(await Order.exists({ order_number: orderNumber }))) return orderNumber;
  }
  return `ORD-${Date.now().toString().slice(-8)}`;
}

/** GET /api/orders — the caller's store orders. */
exports.mine = async (req, res, next) => {
  try {
    return res.json(await withItems(await findMine(req)));
  } catch (error) {
    return next(error);
  }
};

/** GET /api/orders/:id — one of the caller's orders. */
exports.mineOne = async (req, res, next) => {
  try {
    const orders = await findMine(req);
    const order = orders.find((row) => String(row._id) === String(req.params.id));
    if (!order) return res.status(404).json({ message: "Order not found" });
    const [row] = await withItems([order]);
    return res.json(row);
  } catch (error) {
    return next(error);
  }
};

/** POST /api/orders — place an order from the cart. Prices come from the catalogue, never the client. */
exports.create = async (req, res, next) => {
  try {
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const lines = rawItems
      .map((item) => ({
        productId: String(item?.product_id ?? item?.productId ?? ""),
        quantity: Math.max(1, Math.min(99, Number(item?.quantity ?? 1) || 1)),
      }))
      .filter((line) => line.productId);
    if (lines.length === 0) return res.status(400).json({ message: "Your cart is empty" });
    if (lines.length > 50) return res.status(400).json({ message: "Too many items in one order" });

    const customer = req.body?.customer ?? {};
    const name = String(customer.customer_name ?? customer.name ?? "").trim();
    const phone = String(customer.customer_phone ?? customer.phone ?? "").trim();
    if (!name) return res.status(400).json({ message: "Delivery name is required" });
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ message: "Enter a valid 10-digit phone number" });

    const products = await StoreProduct.find({ _id: { $in: lines.map((line) => line.productId) } }).lean();
    const priced = lines
      .map((line) => {
        const product = products.find((row) => String(row._id) === line.productId);
        return product ? { product, quantity: line.quantity } : null;
      })
      .filter(Boolean);
    if (priced.length === 0) return res.status(400).json({ message: "Those products are no longer available" });

    const subtotal = priced.reduce((sum, line) => sum + Number(line.product.price || 0) * line.quantity, 0);
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const total = subtotal + shipping;

    const user = await User.findById(req.user.id).select("email city state").lean();
    const email = String(customer.customer_email ?? customer.email ?? user?.email ?? "").trim();
    const address = [
      customer.address_line,
      customer.city ?? user?.city,
      customer.state ?? user?.state,
      customer.pincode,
    ]
      .map((part) => String(part ?? "").trim())
      .filter(Boolean)
      .join(", ");

    const order = await Order.create({
      order_number: await nextOrderNumber(),
      user_id: req.user.id,
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      shipping_address: address,
      payment_method: customer.payment_method === "razorpay" ? "razorpay" : "cod",
      total,
      status: "placed",
      payment_status: "pending",
      placed_at: new Date(),
    });

    await OrderItem.insertMany(
      priced.map((line) => ({
        order_id: order._id,
        product_id: line.product._id,
        name: line.product.name,
        price: Number(line.product.price || 0),
        quantity: line.quantity,
      })),
    );

    const [row] = await withItems([order.toObject()]);
    return res.status(201).json(row);
  } catch (error) {
    return next(error);
  }
};
