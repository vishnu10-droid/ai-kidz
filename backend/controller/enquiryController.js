const { Enquiry } = require("../models");

const TEXT = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** POST /api/enquiries — public website lead forms (contact, trial, school, franchise). */
exports.create = async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const name = TEXT(body.name, 120);
    const email = TEXT(body.email, 160);
    const phone = TEXT(body.phone, 20);
    if (!name) return res.status(400).json({ message: "Please tell us your name" });
    if (!email && !phone) return res.status(400).json({ message: "Add an email or phone number" });

    const enquiry = await Enquiry.create({
      name,
      email: email || undefined,
      phone: phone || undefined,
      city: TEXT(body.city, 80) || undefined,
      subject: TEXT(body.subject, 180) || "Website enquiry",
      message: TEXT(body.message, 2000) || undefined,
      source: TEXT(body.source, 40) || "website",
      status: "new",
    });

    return res.status(201).json({ id: String(enquiry._id) });
  } catch (error) {
    return next(error);
  }
};
