-- 1. Self-registered schools / centres go live immediately (admins can still suspend them).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _role text := coalesce(new.raw_user_meta_data->>'role', 'student');
  _name text := coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1));
  _phone text := left(nullif(trim(new.raw_user_meta_data->>'phone'), ''), 20);
  _org text := left(nullif(trim(new.raw_user_meta_data->>'org_name'), ''), 200);
  _city text := left(nullif(trim(new.raw_user_meta_data->>'city'), ''), 80);
  _state text := left(nullif(trim(new.raw_user_meta_data->>'state'), ''), 80);
begin
  if _role not in ('student', 'parent', 'school_admin', 'franchise') then _role := 'student'; end if;
  insert into public.profiles (id, full_name, email, phone, city, state)
  values (new.id, _name, new.email, _phone, _city, _state)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, _role::public.app_role) on conflict do nothing;
  if _role = 'student' then
    insert into public.students (user_id, full_name, email, age)
    values (new.id, _name, new.email, nullif(new.raw_user_meta_data->>'age', '')::int)
    on conflict (user_id) do nothing;
  elsif _role = 'parent' then
    insert into public.parents (user_id, full_name, email, phone)
    values (new.id, _name, new.email, _phone)
    on conflict (user_id) do nothing;
  elsif _role = 'school_admin' then
    insert into public.schools (name, email, phone, city, state, owner_id, status)
    values (coalesce(_org, _name || '''s School'), new.email, _phone, _city, _state, new.id, 'active');
    perform public.notify_admins('New school joined', coalesce(_org, _name) || coalesce(' · ' || _city, ''), '/admin/schools');
  elsif _role = 'franchise' then
    insert into public.franchises (name, email, phone, city, state, owner_id, status)
    values (coalesce(_org, _name || '''s Centre'), new.email, _phone, _city, _state, new.id, 'active');
    perform public.notify_admins('New franchise centre joined', coalesce(_org, _name) || coalesce(' · ' || _city, ''), '/admin/franchises');
  end if;
  return new;
end;
$$;

-- 2. Lab setup status for schools and revenue share for centres (admin-managed).
alter table public.schools add column if not exists lab_status text not null default 'not_started';
alter table public.franchises add column if not exists revenue_share numeric(5,2) not null default 20;

create or replace function public.guard_org_admin_fields()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _new jsonb := to_jsonb(new);
  _old jsonb := to_jsonb(old);
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if _new->'owner_id' is distinct from _old->'owner_id'
     or _new->'status' is distinct from _old->'status'
     or _new->'package' is distinct from _old->'package'
     or _new->'permissions' is distinct from _old->'permissions'
     or _new->'lab_status' is distinct from _old->'lab_status'
     or _new->'revenue_share' is distinct from _old->'revenue_share' then
    raise exception 'Only a LearningBIX admin can change approval, ownership, package, lab status, revenue share or permissions';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_org_admin_fields() from public, anon, authenticated;

-- 3. Fee records: a school / centre may only bill its own students.
drop policy if exists "payments insert" on public.payments;
create policy "payments insert" on public.payments for insert to authenticated with check (
  (public.can_manage_org(school_id, franchise_id) and (student_id is null or public.can_manage_student(student_id)))
  or (school_id is null and franchise_id is null and student_id is not null and public.can_manage_student(student_id))
);
drop policy if exists "payments update" on public.payments;
create policy "payments update" on public.payments for update to authenticated
  using (public.can_manage_org(school_id, franchise_id))
  with check (public.can_manage_org(school_id, franchise_id) and (student_id is null or public.can_manage_student(student_id)));

-- 4. One attendance mark per student, day and batch/class (lets the register be re-saved).
create unique index if not exists attendance_unique_mark on public.attendance (student_id, date, batch_id, class_id) nulls not distinct;

-- 5. Family notifications for fee invoices, fee receipts and absences.
create or replace function public.notify_student_family(_sid uuid, _title text, _body text, _student_link text, _parent_link text)
returns void language plpgsql security definer set search_path = public as $$
declare _suid uuid; _puid uuid;
begin
  select s.user_id, p.user_id into _suid, _puid from public.students s left join public.parents p on p.id = s.parent_id where s.id = _sid;
  if _suid is not null then insert into public.notifications (user_id, title, body, link) values (_suid, _title, _body, _student_link); end if;
  if _puid is not null then insert into public.notifications (user_id, title, body, link) values (_puid, _title, _body, _parent_link); end if;
end;
$$;
revoke execute on function public.notify_student_family(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public.on_fee_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.purpose <> 'fee' or new.student_id is null then return new; end if;
  if tg_op = 'INSERT' then
    perform public.notify_student_family(new.student_id, 'New fee invoice',
      coalesce(new.description, 'Fee') || ' · ₹' || to_char(new.amount, 'FM99,99,99,990.00') || coalesce(' · due ' || to_char(new.due_date, 'DD Mon YYYY'), ''),
      '/student/dashboard', '/parent/dashboard');
  elsif new.status = 'paid' and old.status is distinct from 'paid' then
    perform public.notify_student_family(new.student_id, 'Fee payment received',
      coalesce(new.description, 'Fee') || ' · receipt ' || new.receipt_number, '/student/dashboard', '/parent/dashboard');
  end if;
  return new;
end;
$$;
revoke execute on function public.on_fee_change() from public, anon, authenticated;
create trigger payments_fee_notify after insert or update on public.payments for each row execute function public.on_fee_change();

create or replace function public.on_attendance_marked()
returns trigger language plpgsql security definer set search_path = public as $$
declare _name text;
begin
  if new.status = 'absent' and (tg_op = 'INSERT' or old.status is distinct from 'absent') then
    select full_name into _name from public.students where id = new.student_id;
    perform public.notify_student_family(new.student_id, 'Marked absent',
      coalesce(_name, 'Your child') || ' was marked absent on ' || to_char(new.date, 'DD Mon YYYY') || '.', '/student/dashboard', '/parent/dashboard');
  end if;
  return new;
end;
$$;
revoke execute on function public.on_attendance_marked() from public, anon, authenticated;
create trigger attendance_absent_notify after insert or update on public.attendance for each row execute function public.on_attendance_marked();

-- 6. Live notification bell (RLS keeps each user to their own rows).
alter publication supabase_realtime add table public.notifications;