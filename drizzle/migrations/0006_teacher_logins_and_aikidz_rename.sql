CREATE OR REPLACE FUNCTION public.guard_org_admin_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    raise exception 'Only an AIKIDZ admin can change approval, ownership, package, lab status, revenue share or permissions';
  end if;
  return new;
end;
$function$;

-- Accounts created by the server for staff (app metadata, which only the server can set)
-- get a profile only; the server then grants the staff role and links the staff record.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _role text := coalesce(new.raw_user_meta_data->>'role', 'student');
  _name text := coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1));
  _phone text := left(nullif(trim(new.raw_user_meta_data->>'phone'), ''), 20);
  _org text := left(nullif(trim(new.raw_user_meta_data->>'org_name'), ''), 200);
  _city text := left(nullif(trim(new.raw_user_meta_data->>'city'), ''), 80);
  _state text := left(nullif(trim(new.raw_user_meta_data->>'state'), ''), 80);
begin
  insert into public.profiles (id, full_name, email, phone, city, state)
  values (new.id, _name, new.email, _phone, _city, _state)
  on conflict (id) do nothing;
  if new.raw_app_meta_data->>'staff_account' = 'teacher' then
    return new;
  end if;
  if _role not in ('student', 'parent', 'school_admin', 'franchise') then _role := 'student'; end if;
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
$function$;