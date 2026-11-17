-- Sign-up may now create school admins and franchise partners; their school / centre is created
-- automatically in 'pending' status for an admin to approve.
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
    values (coalesce(_org, _name || '''s School'), new.email, _phone, _city, _state, new.id, 'pending');
    perform public.notify_admins('New school sign-up', coalesce(_org, _name) || coalesce(' · ' || _city, ''), '/admin/schools');
  elsif _role = 'franchise' then
    insert into public.franchises (name, email, phone, city, state, owner_id, status)
    values (coalesce(_org, _name || '''s Centre'), new.email, _phone, _city, _state, new.id, 'pending');
    perform public.notify_admins('New franchise sign-up', coalesce(_org, _name) || coalesce(' · ' || _city, ''), '/admin/franchises');
  end if;
  return new;
end;
$$;

-- Owners may edit their school / centre details, but approval status, ownership, package and
-- permissions stay admin-only.
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
     or _new->'permissions' is distinct from _old->'permissions' then
    raise exception 'Only a LearningBIX admin can change approval, ownership, package or permissions';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_org_admin_fields() from public, anon, authenticated;
create trigger schools_guard_admin_fields before update on public.schools for each row execute function public.guard_org_admin_fields();
create trigger franchises_guard_admin_fields before update on public.franchises for each row execute function public.guard_org_admin_fields();

-- Course purchases: remember which course a payment is for.
alter table public.payments add column if not exists course_id uuid references public.courses(id) on delete set null;
create index if not exists payments_course_id_idx on public.payments(course_id);

-- Students and parents no longer self-enrol directly (that would skip payment); enrolments are
-- created by staff or by the server after a verified payment.
drop policy if exists "enrollments insert" on public.enrollments;
create policy "enrollments insert" on public.enrollments for insert to authenticated
  with check (public.can_manage_student(student_id));