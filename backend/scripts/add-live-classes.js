/**
 * Adds upcoming live classes to the demo batches so the student hub always has
 * more than one session to show. Safe to re-run: sessions are matched by title.
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const { Batch, LiveSession } = require("../models");

const DAY = 24 * 60 * 60 * 1000;

/** IST hour on a day offset from today, stored as UTC. */
const at = (dayOffset, hour, minute = 0) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return new Date(date.getTime() + dayOffset * DAY + (hour - 5.5) * 60 * 60 * 1000 + minute * 60 * 1000);
};

const SESSIONS = [
  {
    title: "Sensors & Actuators Deep Dive",
    topic: "How IR and ultrasonic sensors talk to motors",
    meetingUrl: "https://meet.google.com/aikidz-sensors",
    start: at(1, 10),
    end: at(1, 11),
  },
  {
    title: "Line Following Robot Workshop",
    topic: "Calibrate the IR array and tune your PID values live",
    meetingUrl: "https://meet.google.com/aikidz-line-follower",
    start: at(2, 16),
    end: at(2, 17),
  },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const batch = await Batch.findOne({ name: "Robotics Batch A" }).lean();
  if (!batch) throw new Error("Robotics Batch A not found");
  const teacherId = batch.teacher_id;

  for (const session of SESSIONS) {
    const existing = await LiveSession.findOne({ batchId: batch._id, title: session.title });
    if (existing) {
      existing.startTime = session.start;
      existing.endTime = session.end;
      existing.status = "upcoming";
      await existing.save();
      console.log(`updated: ${session.title} → ${session.start.toISOString()}`);
      continue;
    }
    await LiveSession.create({
      title: session.title,
      topic: session.topic,
      meetingUrl: session.meetingUrl,
      batchId: batch._id,
      teacherId,
      startTime: session.start,
      endTime: session.end,
      status: "upcoming",
    });
    console.log(`created: ${session.title} → ${session.start.toISOString()}`);
  }

  const total = await LiveSession.countDocuments({ batchId: batch._id });
  console.log(`Robotics Batch A now has ${total} live sessions.`);
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
