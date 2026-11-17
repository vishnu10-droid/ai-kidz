
-- ===================== TYPES =====================
create type public.app_role as enum ('admin','school_admin','franchise','teacher','student','parent');

-- ===================== IDENTITY =====================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  avatar_url text,
  city text,
  state text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index on public.user_roles(user_id);

-- ===================== ORGANISATIONS =====================
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text, phone text, address text, city text, state text,
  owner_id uuid,
  package text not null default 'starter',
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create index on public.schools(owner_id);
create table public.franchises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid,
  email text, phone text, address text, city text, state text,
  status text not null default 'active',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.franchises(owner_id);

-- ===================== CATALOG: COURSES =====================
create table public.course_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  position int not null default 0
);
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.course_categories(id) on delete set null,
  slug text not null unique,
  title text not null,
  short_description text,
  description text,
  image_url text,
  age_group text,
  duration text,
  level text not null default 'Beginner',
  price numeric(10,2) not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.courses(category_id);
create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position int not null default 0
);
create index on public.course_modules(course_id);
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  content text,
  video_url text,
  pdf_url text,
  duration_minutes int not null default 10,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.lessons(module_id);

-- ===================== PEOPLE =====================
create table public.parents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  full_name text not null,
  email text, phone text,
  created_at timestamptz not null default now()
);
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  school_id uuid references public.schools(id) on delete set null,
  franchise_id uuid references public.franchises(id) on delete set null,
  full_name text not null,
  email text, phone text,
  qualification text,
  experience_years int not null default 0,
  specialization text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create index on public.teachers(user_id);
create index on public.teachers(school_id);
create index on public.teachers(franchise_id);
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade text, section text,
  school_id uuid references public.schools(id) on delete cascade,
  franchise_id uuid references public.franchises(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.classes(school_id);
create index on public.classes(teacher_id);
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  course_id uuid references public.courses(id) on delete set null,
  teacher_id uuid references public.teachers(id) on delete set null,
  school_id uuid references public.schools(id) on delete cascade,
  franchise_id uuid references public.franchises(id) on delete cascade,
  schedule text, timing text, room text,
  capacity int not null default 20,
  start_date date,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create index on public.batches(teacher_id);
create index on public.batches(franchise_id);
create index on public.batches(school_id);
create sequence public.student_code_seq start 1001;
create table public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  parent_id uuid references public.parents(id) on delete set null,
  school_id uuid references public.schools(id) on delete set null,
  franchise_id uuid references public.franchises(id) on delete set null,
  class_id uuid references public.classes(id) on delete set null,
  student_code text not null unique default ('LBX' || to_char(now(), 'YY') || nextval('public.student_code_seq')::text),
  full_name text not null,
  email text, phone text,
  age int, grade text,
  guardian_name text, guardian_phone text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
create index on public.students(parent_id);
create index on public.students(school_id);
create index on public.students(franchise_id);
create index on public.students(class_id);

-- ===================== LEARNING =====================
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete set null,
  status text not null default 'active',
  progress int not null default 0,
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (student_id, course_id)
);
create index on public.enrollments(course_id);
create index on public.enrollments(batch_id);
create table public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete set null,
  teacher_id uuid references public.teachers(id) on delete set null,
  title text not null,
  description text,
  due_date date,
  max_marks int not null default 100,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.assignments(course_id);
create index on public.assignments(teacher_id);
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  content text,
  file_url text,
  status text not null default 'submitted',
  marks int,
  feedback text,
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  unique (assignment_id, student_id)
);
create index on public.submissions(student_id);
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  title text not null,
  description text,
  pass_mark int not null default 60,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.quizzes(course_id);
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  correct_index int not null default 0,
  position int not null default 0
);
create index on public.quiz_questions(quiz_id);
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  score int not null default 0,
  total int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.quiz_attempts(student_id);
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete set null,
  class_id uuid references public.classes(id) on delete set null,
  date date not null default current_date,
  status text not null default 'present',
  marked_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.attendance(student_id);
create index on public.attendance(batch_id, date);

-- ===================== STORE =====================
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  position int not null default 0
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories(id) on delete set null,
  slug text not null unique,
  name text not null,
  short_description text,
  description text,
  price numeric(10,2) not null,
  mrp numeric(10,2) not null,
  rating numeric(2,1) not null default 4.5,
  reviews_count int not null default 0,
  age_group text,
  image_url text,
  specifications jsonb not null default '{}'::jsonb,
  box_contents text[] not null default '{}',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.products(category_id);
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  position int not null default 0
);
create index on public.product_images(product_id);
create table public.inventory (
  product_id uuid primary key references public.products(id) on delete cascade,
  stock int not null default 0,
  updated_at timestamptz not null default now()
);
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  updated_at timestamptz not null default now()
);
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null default 1 check (quantity between 1 and 99),
  unique (cart_id, product_id)
);
create sequence public.order_number_seq start 10001;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  order_number text not null unique default ('LBX-' || nextval('public.order_number_seq')::text),
  status text not null default 'pending',
  payment_status text not null default 'pending',
  payment_method text not null default 'razorpay',
  subtotal numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  customer_name text, customer_email text, customer_phone text,
  address_line text, city text, state text, pincode text,
  razorpay_order_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.orders(user_id);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  image_url text,
  price numeric(10,2) not null,
  quantity int not null
);
create index on public.order_items(order_id);
create sequence public.receipt_seq start 5001;
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid,
  student_id uuid references public.students(id) on delete set null,
  franchise_id uuid references public.franchises(id) on delete set null,
  school_id uuid references public.schools(id) on delete set null,
  purpose text not null default 'order',
  description text,
  amount numeric(10,2) not null,
  currency text not null default 'INR',
  method text,
  provider text not null default 'razorpay',
  provider_order_id text,
  provider_payment_id text,
  status text not null default 'pending',
  receipt_number text not null unique default ('RCPT-' || nextval('public.receipt_seq')::text),
  due_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.payments(user_id);
create index on public.payments(student_id);
create index on public.payments(franchise_id);
create index on public.payments(order_id);

-- ===================== CERTIFICATES & LEADS =====================
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  certificate_code text not null unique default ('LBX-CERT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  issued_at timestamptz not null default now(),
  issued_by uuid,
  unique (student_id, course_id)
);
create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text, phone text, subject text, message text,
  source text not null default 'contact',
  child_name text, child_age int, program text,
  franchise_id uuid references public.franchises(id) on delete set null,
  status text not null default 'new',
  follow_up_date date,
  notes text,
  converted_student_id uuid references public.students(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.enquiries(franchise_id);
create table public.franchise_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_name text not null,
  email text not null, phone text not null,
  city text, state text,
  business_experience text, investment_capacity text, message text,
  status text not null default 'new',
  admin_notes text,
  created_at timestamptz not null default now()
);
create table public.school_applications (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  school_email text not null,
  contact_person text not null,
  phone text not null,
  address text, city text, state text, message text,
  status text not null default 'new',
  admin_notes text,
  created_at timestamptz not null default now()
);
create table public.trial_bookings (
  id uuid primary key default gen_random_uuid(),
  parent_name text not null,
  child_name text not null,
  child_age int not null,
  email text not null, phone text not null,
  preferred_program text not null,
  preferred_date date not null,
  preferred_time text not null,
  status text not null default 'new',
  notes text,
  created_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications(user_id, created_at desc);

-- ===================== HELPER FUNCTIONS =====================
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;
create or replace function public.owns_school(_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.schools where id = _id and owner_id = auth.uid())
$$;
create or replace function public.owns_franchise(_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.franchises where id = _id and owner_id = auth.uid())
$$;
create or replace function public.can_manage_org(_school uuid, _franchise uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or (_school is not null and public.owns_school(_school))
    or (_franchise is not null and public.owns_franchise(_franchise))
$$;
create or replace function public.my_teacher_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.teachers where user_id = auth.uid()
$$;
create or replace function public.my_student_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.students where user_id = auth.uid()
  union
  select s.id from public.students s join public.parents p on p.id = s.parent_id where p.user_id = auth.uid()
$$;
create or replace function public.can_manage_student(_sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.students s where s.id = _sid and public.can_manage_org(s.school_id, s.franchise_id))
$$;
create or replace function public.teaches_student(_sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.enrollments e join public.batches b on b.id = e.batch_id
    where e.student_id = _sid and b.teacher_id in (select public.my_teacher_ids())
  ) or exists (
    select 1 from public.students s join public.classes c on c.id = s.class_id
    where s.id = _sid and c.teacher_id in (select public.my_teacher_ids())
  )
$$;
create or replace function public.can_view_student(_sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or _sid in (select public.my_student_ids())
    or public.can_manage_student(_sid)
    or public.teaches_student(_sid)
$$;
create or replace function public.is_teacher()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'teacher')
$$;

-- ===================== GRANTS =====================
grant usage on sequence public.student_code_seq, public.order_number_seq, public.receipt_seq to authenticated, service_role;

grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
grant select, insert, update, delete on public.schools, public.franchises to authenticated;
grant all on public.schools, public.franchises to service_role;
grant select on public.course_categories, public.courses, public.course_modules, public.lessons to anon;
grant select, insert, update, delete on public.course_categories, public.courses, public.course_modules, public.lessons to authenticated;
grant all on public.course_categories, public.courses, public.course_modules, public.lessons to service_role;
grant select, insert, update, delete on public.parents, public.teachers, public.classes, public.batches, public.students to authenticated;
grant all on public.parents, public.teachers, public.classes, public.batches, public.students to service_role;
grant select, insert, update, delete on public.enrollments, public.learning_progress, public.assignments, public.submissions, public.quizzes, public.quiz_questions, public.quiz_attempts, public.attendance to authenticated;
grant all on public.enrollments, public.learning_progress, public.assignments, public.submissions, public.quizzes, public.quiz_questions, public.quiz_attempts, public.attendance to service_role;
grant select on public.product_categories, public.products, public.product_images, public.inventory to anon;
grant select, insert, update, delete on public.product_categories, public.products, public.product_images, public.inventory to authenticated;
grant all on public.product_categories, public.products, public.product_images, public.inventory to service_role;
grant select, insert, update, delete on public.carts, public.cart_items to authenticated;
grant all on public.carts, public.cart_items to service_role;
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant all on public.orders, public.order_items to service_role;
grant select, insert, update, delete on public.payments, public.certificates to authenticated;
grant all on public.payments, public.certificates to service_role;
grant insert on public.enquiries, public.franchise_applications, public.school_applications, public.trial_bookings to anon;
grant select, insert, update, delete on public.enquiries, public.franchise_applications, public.school_applications, public.trial_bookings to authenticated;
grant all on public.enquiries, public.franchise_applications, public.school_applications, public.trial_bookings to service_role;
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;

-- ===================== RLS =====================
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.schools enable row level security;
alter table public.franchises enable row level security;
alter table public.course_categories enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.parents enable row level security;
alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.batches enable row level security;
alter table public.students enable row level security;
alter table public.enrollments enable row level security;
alter table public.learning_progress enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.attendance enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.inventory enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.certificates enable row level security;
alter table public.enquiries enable row level security;
alter table public.franchise_applications enable row level security;
alter table public.school_applications enable row level security;
alter table public.trial_bookings enable row level security;
alter table public.notifications enable row level security;
