-- profiles
create policy "profiles read own or admin" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles update own or admin" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- user_roles
create policy "roles read own or admin" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "roles admin insert" on public.user_roles for insert to authenticated with check (public.is_admin());
create policy "roles admin update" on public.user_roles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "roles admin delete" on public.user_roles for delete to authenticated using (public.is_admin());

-- schools / franchises
create policy "schools read" on public.schools for select to authenticated using (public.is_admin() or owner_id = auth.uid() or id in (select school_id from public.teachers where user_id = auth.uid()));
create policy "schools admin insert" on public.schools for insert to authenticated with check (public.is_admin());
create policy "schools update" on public.schools for update to authenticated using (public.is_admin() or owner_id = auth.uid()) with check (public.is_admin() or owner_id = auth.uid());
create policy "schools admin delete" on public.schools for delete to authenticated using (public.is_admin());
create policy "franchises read" on public.franchises for select to authenticated using (public.is_admin() or owner_id = auth.uid() or id in (select franchise_id from public.teachers where user_id = auth.uid()));
create policy "franchises admin insert" on public.franchises for insert to authenticated with check (public.is_admin());
create policy "franchises update" on public.franchises for update to authenticated using (public.is_admin() or owner_id = auth.uid()) with check (public.is_admin() or owner_id = auth.uid());
create policy "franchises admin delete" on public.franchises for delete to authenticated using (public.is_admin());

-- course catalog (public read)
create policy "categories public read" on public.course_categories for select to anon, authenticated using (true);
create policy "categories admin write" on public.course_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "courses public read" on public.courses for select to anon, authenticated using (is_published or public.is_admin() or public.is_teacher());
create policy "courses admin insert" on public.courses for insert to authenticated with check (public.is_admin());
create policy "courses admin update" on public.courses for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "courses admin delete" on public.courses for delete to authenticated using (public.is_admin());
create policy "modules public read" on public.course_modules for select to anon, authenticated using (true);
create policy "modules staff write" on public.course_modules for all to authenticated using (public.is_admin() or public.is_teacher()) with check (public.is_admin() or public.is_teacher());
create policy "lessons public read" on public.lessons for select to anon, authenticated using (true);
create policy "lessons staff write" on public.lessons for all to authenticated using (public.is_admin() or public.is_teacher()) with check (public.is_admin() or public.is_teacher());

-- parents
create policy "parents read" on public.parents for select to authenticated using (user_id = auth.uid() or public.is_admin() or exists (select 1 from public.students s where s.parent_id = parents.id and public.can_manage_org(s.school_id, s.franchise_id)));
create policy "parents insert" on public.parents for insert to authenticated with check (user_id = auth.uid() or public.is_admin() or public.has_role(auth.uid(), 'school_admin') or public.has_role(auth.uid(), 'franchise'));
create policy "parents update" on public.parents for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "parents admin delete" on public.parents for delete to authenticated using (public.is_admin());

-- teachers
create policy "teachers read" on public.teachers for select to authenticated using (user_id = auth.uid() or public.can_manage_org(school_id, franchise_id) or exists (select 1 from public.batches b where b.teacher_id = teachers.id and b.id in (select e.batch_id from public.enrollments e where e.student_id in (select public.my_student_ids()))));
create policy "teachers insert" on public.teachers for insert to authenticated with check (public.can_manage_org(school_id, franchise_id));
create policy "teachers update" on public.teachers for update to authenticated using (public.can_manage_org(school_id, franchise_id) or user_id = auth.uid()) with check (public.can_manage_org(school_id, franchise_id) or user_id = auth.uid());
create policy "teachers delete" on public.teachers for delete to authenticated using (public.can_manage_org(school_id, franchise_id));

-- classes
create policy "classes read" on public.classes for select to authenticated using (public.can_manage_org(school_id, franchise_id) or teacher_id in (select public.my_teacher_ids()) or id in (select class_id from public.students where id in (select public.my_student_ids())));
create policy "classes write" on public.classes for insert to authenticated with check (public.can_manage_org(school_id, franchise_id));
create policy "classes update" on public.classes for update to authenticated using (public.can_manage_org(school_id, franchise_id)) with check (public.can_manage_org(school_id, franchise_id));
create policy "classes delete" on public.classes for delete to authenticated using (public.can_manage_org(school_id, franchise_id));

-- batches
create policy "batches read" on public.batches for select to authenticated using (public.can_manage_org(school_id, franchise_id) or teacher_id in (select public.my_teacher_ids()) or id in (select batch_id from public.enrollments where student_id in (select public.my_student_ids())));
create policy "batches insert" on public.batches for insert to authenticated with check (public.can_manage_org(school_id, franchise_id));
create policy "batches update" on public.batches for update to authenticated using (public.can_manage_org(school_id, franchise_id)) with check (public.can_manage_org(school_id, franchise_id));
create policy "batches delete" on public.batches for delete to authenticated using (public.can_manage_org(school_id, franchise_id));

-- students
create policy "students read" on public.students for select to authenticated using (public.can_view_student(id));
create policy "students insert" on public.students for insert to authenticated with check (public.can_manage_org(school_id, franchise_id) or parent_id in (select id from public.parents where user_id = auth.uid()));
create policy "students update" on public.students for update to authenticated using (public.can_manage_student(id) or user_id = auth.uid() or parent_id in (select id from public.parents where user_id = auth.uid())) with check (public.can_manage_org(school_id, franchise_id) or user_id = auth.uid() or parent_id in (select id from public.parents where user_id = auth.uid()));
create policy "students delete" on public.students for delete to authenticated using (public.can_manage_student(id));

-- enrollments
create policy "enrollments read" on public.enrollments for select to authenticated using (public.can_view_student(student_id));
create policy "enrollments insert" on public.enrollments for insert to authenticated with check (public.can_manage_student(student_id) or student_id in (select public.my_student_ids()));
create policy "enrollments update" on public.enrollments for update to authenticated using (public.can_manage_student(student_id) or public.teaches_student(student_id)) with check (public.can_manage_student(student_id) or public.teaches_student(student_id));
create policy "enrollments delete" on public.enrollments for delete to authenticated using (public.can_manage_student(student_id));

-- learning progress
create policy "progress read" on public.learning_progress for select to authenticated using (public.can_view_student(student_id));
create policy "progress delete own" on public.learning_progress for delete to authenticated using (student_id in (select public.my_student_ids()));

-- assignments
create policy "assignments read" on public.assignments for select to authenticated using (
  public.is_admin() or teacher_id in (select public.my_teacher_ids()) or created_by = auth.uid()
  or exists (select 1 from public.enrollments e where e.course_id = assignments.course_id and e.student_id in (select public.my_student_ids()))
  or exists (select 1 from public.teachers t where t.id = assignments.teacher_id and public.can_manage_org(t.school_id, t.franchise_id))
);
create policy "assignments insert" on public.assignments for insert to authenticated with check (public.is_admin() or public.is_teacher() or public.has_role(auth.uid(), 'school_admin') or public.has_role(auth.uid(), 'franchise'));
create policy "assignments update" on public.assignments for update to authenticated using (public.is_admin() or created_by = auth.uid() or teacher_id in (select public.my_teacher_ids())) with check (public.is_admin() or created_by = auth.uid() or teacher_id in (select public.my_teacher_ids()));
create policy "assignments delete" on public.assignments for delete to authenticated using (public.is_admin() or created_by = auth.uid() or teacher_id in (select public.my_teacher_ids()));

-- submissions
create policy "submissions read" on public.submissions for select to authenticated using (
  public.can_view_student(student_id)
  or exists (select 1 from public.assignments a where a.id = submissions.assignment_id and (a.created_by = auth.uid() or a.teacher_id in (select public.my_teacher_ids())))
);
create policy "submissions insert own" on public.submissions for insert to authenticated with check (student_id in (select public.my_student_ids()) and status = 'submitted' and marks is null);
create policy "submissions grade" on public.submissions for update to authenticated using (
  public.is_admin() or exists (select 1 from public.assignments a where a.id = submissions.assignment_id and (a.created_by = auth.uid() or a.teacher_id in (select public.my_teacher_ids())))
) with check (true);
create policy "submissions delete" on public.submissions for delete to authenticated using (public.is_admin());

-- quizzes
create policy "quizzes read" on public.quizzes for select to authenticated using (true);
create policy "quizzes insert" on public.quizzes for insert to authenticated with check (public.is_admin() or public.is_teacher());
create policy "quizzes update" on public.quizzes for update to authenticated using (public.is_admin() or created_by = auth.uid()) with check (public.is_admin() or created_by = auth.uid());
create policy "quizzes delete" on public.quizzes for delete to authenticated using (public.is_admin() or created_by = auth.uid());
create policy "questions staff read" on public.quiz_questions for select to authenticated using (public.is_admin() or public.is_teacher());
create policy "questions staff insert" on public.quiz_questions for insert to authenticated with check (public.is_admin() or exists (select 1 from public.quizzes q where q.id = quiz_id and q.created_by = auth.uid()));
create policy "questions staff update" on public.quiz_questions for update to authenticated using (public.is_admin() or exists (select 1 from public.quizzes q where q.id = quiz_id and q.created_by = auth.uid())) with check (true);
create policy "questions staff delete" on public.quiz_questions for delete to authenticated using (public.is_admin() or exists (select 1 from public.quizzes q where q.id = quiz_id and q.created_by = auth.uid()));
create policy "attempts read" on public.quiz_attempts for select to authenticated using (public.can_view_student(student_id) or exists (select 1 from public.quizzes q where q.id = quiz_id and q.created_by = auth.uid()));

-- attendance
create policy "attendance read" on public.attendance for select to authenticated using (public.can_view_student(student_id) or marked_by = auth.uid());
create policy "attendance insert" on public.attendance for insert to authenticated with check (public.teaches_student(student_id) or public.can_manage_student(student_id));
create policy "attendance update" on public.attendance for update to authenticated using (public.teaches_student(student_id) or public.can_manage_student(student_id)) with check (public.teaches_student(student_id) or public.can_manage_student(student_id));
create policy "attendance delete" on public.attendance for delete to authenticated using (public.teaches_student(student_id) or public.can_manage_student(student_id));

-- store catalog
create policy "pcat public read" on public.product_categories for select to anon, authenticated using (true);
create policy "pcat admin write" on public.product_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products public read" on public.products for select to anon, authenticated using (is_active or public.is_admin());
create policy "products admin write" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "pimages public read" on public.product_images for select to anon, authenticated using (true);
create policy "pimages admin write" on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "inventory public read" on public.inventory for select to anon, authenticated using (true);
create policy "inventory admin write" on public.inventory for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- carts
create policy "carts own" on public.carts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart items own" on public.cart_items for all to authenticated using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())) with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- orders
create policy "orders read" on public.orders for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "orders admin update" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "order items read" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

-- payments
create policy "payments read" on public.payments for select to authenticated using (
  user_id = auth.uid() or public.is_admin()
  or (franchise_id is not null and public.owns_franchise(franchise_id))
  or (school_id is not null and public.owns_school(school_id))
  or (student_id is not null and (student_id in (select public.my_student_ids()) or public.can_manage_student(student_id)))
);
create policy "payments insert" on public.payments for insert to authenticated with check (public.can_manage_org(school_id, franchise_id) or (student_id is not null and public.can_manage_student(student_id)));
create policy "payments update" on public.payments for update to authenticated using (public.can_manage_org(school_id, franchise_id)) with check (public.can_manage_org(school_id, franchise_id));
create policy "payments delete" on public.payments for delete to authenticated using (public.is_admin());

-- certificates
create policy "certificates read" on public.certificates for select to authenticated using (public.can_view_student(student_id));
create policy "certificates insert" on public.certificates for insert to authenticated with check (public.can_manage_student(student_id) or public.teaches_student(student_id));
create policy "certificates delete" on public.certificates for delete to authenticated using (public.is_admin());

-- public lead forms
create policy "enquiries public insert" on public.enquiries for insert to anon, authenticated with check (status = 'new' and char_length(name) between 1 and 120 and coalesce(char_length(message), 0) <= 2000 and notes is null and converted_student_id is null);
create policy "enquiries staff read" on public.enquiries for select to authenticated using (public.is_admin() or (franchise_id is not null and public.owns_franchise(franchise_id)));
create policy "enquiries staff update" on public.enquiries for update to authenticated using (public.is_admin() or (franchise_id is not null and public.owns_franchise(franchise_id))) with check (public.is_admin() or (franchise_id is not null and public.owns_franchise(franchise_id)));
create policy "enquiries staff delete" on public.enquiries for delete to authenticated using (public.is_admin() or (franchise_id is not null and public.owns_franchise(franchise_id)));
create policy "franchise apps public insert" on public.franchise_applications for insert to anon, authenticated with check (status = 'new' and admin_notes is null and char_length(applicant_name) between 1 and 120 and coalesce(char_length(message), 0) <= 2000);
create policy "franchise apps admin" on public.franchise_applications for select to authenticated using (public.is_admin());
create policy "franchise apps admin update" on public.franchise_applications for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "franchise apps admin delete" on public.franchise_applications for delete to authenticated using (public.is_admin());
create policy "school apps public insert" on public.school_applications for insert to anon, authenticated with check (status = 'new' and admin_notes is null and char_length(school_name) between 1 and 200 and coalesce(char_length(message), 0) <= 2000);
create policy "school apps admin" on public.school_applications for select to authenticated using (public.is_admin());
create policy "school apps admin update" on public.school_applications for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "school apps admin delete" on public.school_applications for delete to authenticated using (public.is_admin());
create policy "trials public insert" on public.trial_bookings for insert to anon, authenticated with check (status = 'new' and notes is null and char_length(parent_name) between 1 and 120 and child_age between 3 and 18);
create policy "trials admin" on public.trial_bookings for select to authenticated using (public.is_admin());
create policy "trials admin update" on public.trial_bookings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "trials admin delete" on public.trial_bookings for delete to authenticated using (public.is_admin());

-- notifications
create policy "notifications own read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications own update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications own delete" on public.notifications for delete to authenticated using (user_id = auth.uid());

-- ===================== TRIGGERS & RPCs =====================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _role text := coalesce(new.raw_user_meta_data->>'role', 'student');
  _name text := coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1));
begin
  if _role not in ('student', 'parent') then _role := 'student'; end if;
  insert into public.profiles (id, full_name, email, phone)
  values (new.id, _name, new.email, new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, _role::public.app_role) on conflict do nothing;
  if _role = 'student' then
    insert into public.students (user_id, full_name, email, age)
    values (new.id, _name, new.email, nullif(new.raw_user_meta_data->>'age', '')::int)
    on conflict (user_id) do nothing;
  else
    insert into public.parents (user_id, full_name, email, phone)
    values (new.id, _name, new.email, new.raw_user_meta_data->>'phone')
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.notify_admins(_title text, _body text, _link text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, body, link)
  select user_id, _title, _body, _link from public.user_roles where role = 'admin'
$$;
revoke execute on function public.notify_admins(text, text, text) from public, anon, authenticated;

create or replace function public.on_lead_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'trial_bookings' then
    perform public.notify_admins('New free trial booking', new.parent_name || ' booked a trial for ' || new.child_name, '/admin/trials');
  elsif tg_table_name = 'enquiries' then
    perform public.notify_admins('New enquiry', new.name || coalesce(': ' || new.subject, ''), '/admin/enquiries');
    if new.franchise_id is not null then
      insert into public.notifications (user_id, title, body, link)
      select owner_id, 'New enquiry', new.name, '/franchise/enquiries' from public.franchises where id = new.franchise_id and owner_id is not null;
    end if;
  elsif tg_table_name = 'franchise_applications' then
    perform public.notify_admins('New franchise application', new.applicant_name || ' from ' || coalesce(new.city, ''), '/admin/franchises');
  elsif tg_table_name = 'school_applications' then
    perform public.notify_admins('New school enquiry', new.school_name, '/admin/schools');
  end if;
  return new;
end;
$$;
create trigger trial_created after insert on public.trial_bookings for each row execute function public.on_lead_created();
create trigger enquiry_created after insert on public.enquiries for each row execute function public.on_lead_created();
create trigger franchise_app_created after insert on public.franchise_applications for each row execute function public.on_lead_created();
create trigger school_app_created after insert on public.school_applications for each row execute function public.on_lead_created();

create or replace function public.on_order_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status or new.payment_status is distinct from old.payment_status then
    new.updated_at := now();
    insert into public.notifications (user_id, title, body, link)
    values (new.user_id, 'Order ' || new.order_number || ' updated', 'Status: ' || new.status || ' · Payment: ' || new.payment_status, '/orders');
  end if;
  return new;
end;
$$;
create trigger order_status_change before update on public.orders for each row execute function public.on_order_status_change();

create or replace function public.on_submission_graded()
returns trigger language plpgsql security definer set search_path = public as $$
declare _uid uuid;
begin
  if new.marks is not null and (old.marks is null or new.marks <> old.marks) then
    new.status := 'graded';
    new.graded_at := now();
    select user_id into _uid from public.students where id = new.student_id;
    if _uid is not null then
      insert into public.notifications (user_id, title, body, link)
      values (_uid, 'Assignment graded', 'You scored ' || new.marks, '/student/assignments');
    end if;
  end if;
  return new;
end;
$$;
create trigger submission_graded before update on public.submissions for each row execute function public.on_submission_graded();

-- Mark a lesson complete for the signed-in student; recomputes course progress and issues a certificate at 100%.
create or replace function public.complete_lesson(_lesson_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  _sid uuid; _course uuid; _total int; _done int; _pct int;
begin
  select id into _sid from public.students where user_id = auth.uid();
  if _sid is null then raise exception 'No student profile for this account'; end if;
  select m.course_id into _course from public.lessons l join public.course_modules m on m.id = l.module_id where l.id = _lesson_id;
  if _course is null then raise exception 'Lesson not found'; end if;
  if not exists (select 1 from public.enrollments where student_id = _sid and course_id = _course) then
    raise exception 'Enroll in this course first';
  end if;
  insert into public.learning_progress (student_id, lesson_id) values (_sid, _lesson_id) on conflict do nothing;
  select count(*) into _total from public.lessons l join public.course_modules m on m.id = l.module_id where m.course_id = _course;
  select count(*) into _done from public.learning_progress lp join public.lessons l on l.id = lp.lesson_id join public.course_modules m on m.id = l.module_id where m.course_id = _course and lp.student_id = _sid;
  _pct := case when _total = 0 then 0 else least(100, round(100.0 * _done / _total)::int) end;
  update public.enrollments set progress = _pct,
    status = case when _pct >= 100 then 'completed' else 'active' end,
    completed_at = case when _pct >= 100 then coalesce(completed_at, now()) else null end
  where student_id = _sid and course_id = _course;
  if _pct >= 100 then
    insert into public.certificates (student_id, course_id) values (_sid, _course) on conflict do nothing;
    insert into public.notifications (user_id, title, body, link)
    values (auth.uid(), 'Certificate earned!', 'You completed a course. Download your certificate.', '/student/certificates');
  end if;
  return _pct;
end;
$$;
revoke execute on function public.complete_lesson(uuid) from public, anon;
grant execute on function public.complete_lesson(uuid) to authenticated;

-- Questions for a student without the answer key
create or replace function public.get_quiz_questions(_quiz_id uuid)
returns table (id uuid, question text, options jsonb, "position" int)
language sql stable security definer set search_path = public as $$
  select q.id, q.question, q.options, q.position from public.quiz_questions q
  where q.quiz_id = _quiz_id and auth.uid() is not null order by q.position
$$;
revoke execute on function public.get_quiz_questions(uuid) from public, anon;
grant execute on function public.get_quiz_questions(uuid) to authenticated;

-- Score a quiz server-side and record the attempt
create or replace function public.submit_quiz(_quiz_id uuid, _answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _sid uuid; _score int := 0; _total int := 0; r record;
begin
  select id into _sid from public.students where user_id = auth.uid();
  if _sid is null then raise exception 'No student profile for this account'; end if;
  for r in select id, correct_index from public.quiz_questions where quiz_id = _quiz_id loop
    _total := _total + 1;
    if (_answers ->> r.id::text) is not null and (_answers ->> r.id::text)::int = r.correct_index then
      _score := _score + 1;
    end if;
  end loop;
  insert into public.quiz_attempts (quiz_id, student_id, answers, score, total) values (_quiz_id, _sid, _answers, _score, _total);
  return jsonb_build_object('score', _score, 'total', _total);
end;
$$;
revoke execute on function public.submit_quiz(uuid, jsonb) from public, anon;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;

-- Public certificate verification by code
create or replace function public.verify_certificate(_code text)
returns table (student_name text, course_title text, issued_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.full_name, c.title, ce.issued_at from public.certificates ce
  join public.students s on s.id = ce.student_id join public.courses c on c.id = ce.course_id
  where ce.certificate_code = upper(trim(_code))
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;