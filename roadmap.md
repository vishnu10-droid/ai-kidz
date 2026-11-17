# AIKIDZ roadmap

- [x] Design system, fonts, header/footer, animations
- [x] Images (hero, programs, products, projects)
- [x] Database: all tables, roles, RLS, seed courses/products/quizzes
- [x] Homepage (all 14 sections, live products/courses)
- [x] Shared lead forms (contact, trial, school, franchise) saving to the database
- [x] Public pages: about, school, franchisee, bixcode
- [x] Public pages: programs (+5), course detail, learning center (+detail), contact, free trial, privacy, terms, verify certificate
- [x] Shop: list, detail, cart page, checkout, orders + order detail
- [ ] Razorpay test integration for kits and courses (code ready; needs RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET from the user)
- [x] Auth pages: login, register, forgot/reset password
- [x] Register: school admin + franchise partner self-signup with auto-created school/centre (pending admin approval)
- [x] Role redirect after login (send to role dashboard once dashboards exist; until then home)
- [x] Dashboards: student, teacher, school admin, franchise, parent
- [x] Admin dashboard: overview, trials, enquiries, schools, franchises, orders, users & roles
- [x] Course purchase (Enroll now) with Razorpay, enrolment created after verified payment (live test pending keys)
- [x] Certificates PDF, notifications UI
- [ ] Email notifications (needs an email sender domain)
- [x] Tests for pricing (shipping, free-shipping threshold, discount, ₹ format)

## Handover follow-ups (Nov 2026)
- [x] Home page "Courses kids love" empty (course list query rejected by the database)
- [x] Mobile/tablet fixes: hero "Live mentors" badge cutoff, footer whitespace, sideways scrolling on phones
- [ ] Carry the home page's EdTech look to subpages and sign-in screens (they already share cards, colours and fonts; waiting on the user: should subpage tops switch to the home page's dark style?)
- [ ] Razorpay end-to-end test (waiting on RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)

## Move to this project
- [x] Pages, design, database, sign-in (email + Google), file storage, catalog, photos (re-imported from app-seed-arrival-main.zip)
- [ ] Import existing records and users from the old project (waiting on exports from the user)
- [ ] Razorpay test keys (waiting on the user)
- [x] First admin account (content.creator.krishsehgal@gmail.com)

## Full platform brief (Nov 14 2026)
- [x] Sign-up: school / centre accounts go live straight away (no approval wait)
- [x] Admin: conversion rate + activity feed; trials Pending/Scheduled/Completed/Converted; orders Packed step; school lab status + student/teacher counts; centre revenue + revenue share
- [x] School & centre: fee invoices (create, mark paid, receipt PDF) and attendance
- [x] Teacher: batch/class attendance marking; grading with feedback
- [x] Parent: children's attendance and fee receipts
- [x] Student: assignments page (submit work); certificate PDF download
- [x] Live notifications in every dashboard
- [x] Tighten fee records so a school can't bill another school's students
- [x] Razorpay: signature check on Web Crypto
- [ ] Razorpay end-to-end test (waiting on keys)
- [ ] Remove temporary QA test accounts and data (lbx-qa-*@mailinator.com, Sunrise QA School) — paused by user
- [x] Audit every page at 375 / 768 / 1280 and sign-in flows for each role

## Nov 15 2026 requests
- [x] Sign-up logs straight in (no confirmation email) — not yet tried in the browser
- [x] Rename LearningBIX → AIKIDZ everywhere (site, shop product text, admin message)
- [x] Photos that fit each page and its content (22 new photos; projects, gallery, courses and spare-parts kit switched)
- [x] Faster page-to-page navigation (load on hover, reuse recent data, top loading bar) — not yet measured

## Nov 16 2026 requests
- [x] School/centre sets a teacher's login email + password (new teacher or existing via "Set login"); teacher signs in to their dashboard
