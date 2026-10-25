--other sql codes were executed but due to technical error they were lost. 
--whatever was saved has been added here.



create table bookings (
    booking_id bigint generated always as identity primary key,
    user_id uuid not null,
    event_id bigint not null,
    booking_date date not null default current_date,
    ticket_quantity int not null check (ticket_quantity > 0),
    total_amount numeric(10,2) not null check (total_amount >= 0),
    status varchar(20) not null default 'pending'
        check (status in ('pending', 'confirmed', 'cancelled')),

    constraint fk_booking_user
        foreign key (user_id)
        references auth.users(id),

    constraint fk_booking_event
        foreign key (event_id)
        references events(event_id)
);

create table payments (
    payment_id bigint generated always as identity primary key,
    booking_id bigint not null,
    amount numeric(10,2) not null check (amount >= 0),
    payment_method varchar(30),
    payment_status varchar(20) not null default 'pending'
        check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
    payment_date timestamptz,
    transaction_ref varchar(255) unique,

    constraint fk_payment_booking
        foreign key (booking_id)
        references bookings(booking_id)
);

create table reviews (
    review_id bigint generated always as identity primary key,
    user_id uuid not null,
    event_id bigint not null,
    rating int not null check (rating between 1 and 5),
    comment text,
    review_date timestamptz default now(),

    constraint fk_review_user
        foreign key (user_id)
        references auth.users(id),

    constraint fk_review_event
        foreign key (event_id)
        references events(event_id),

    constraint unique_user_event_review
        unique (user_id, event_id)
);

drop table users;


-- STEP A: Create the profiles table
create table public.profiles (
    id uuid primary key
        references auth.users(id) on delete cascade,
    full_name text,
    role text not null default 'organizer'
        check (role in ('admin', 'organizer'))
);

-- STEP B: Enable Row Level Security
alter table public.profiles enable row level security;

-- Browser clients cannot insert, update or delete profiles
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

-- STEP C: Create a profile automatically on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, full_name, role)
    values (
        new.id,
        new.raw_user_meta_data ->> 'full_name',
        'organizer'
    );

    return new;
end;
$$;

-- STEP D: Register the signup trigger
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- STEP E: Add profiles for existing Auth users
insert into public.profiles (id, full_name, role)
select
    u.id,
    u.raw_user_meta_data ->> 'full_name',
    'organizer'
from auth.users u
where not exists (
    select 1
    from public.profiles p
    where p.id = u.id
);

SELECT
    con.conname AS constraint_name,
    CASE con.contype
        'p' THEN 'PRIMARY KEY'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'c' THEN 'CHECK'
        WHEN 't' THEN 'TRIGGER'
        ELSE con.contype::text
    END AS constraint_type,
    att.attname AS column_name,
    f_tbl.relname AS foreign_table,
    f_att.attname AS foreign_column
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
LEFT JOIN pg_class f_tbl ON f_tbl.oid = con.confrelid
LEFT JOIN pg_attribute f_att f_att.attrelid = con.confrelid AND f_att.attnum = ANY(con.confkey)
WHERE rel.relname = 'events'
  AND nsp.nspname = 'public';


-- Step 1: Allow vendors to be referenced by their ID and service type together.
ALTER TABLE public.vendors
ADD CONSTRAINT vendors_id_service_unique
UNIQUE (vendor_id, service_id);

-- Step 2: Add service_id to event_vendors.
ALTER TABLE public.event_vendors
ADD COLUMN service_id BIGINT;

-- Step 3: Fill the service type for existing vendor bookings.
UPDATE public.event_vendors AS ev
SET service_id = v.service_id
FROM public.vendors AS v
WHERE ev.vendor_id = v.vendor_id;

-- Step 4: Require a service type for every vendor selection.
ALTER TABLE public.event_vendors
ALTER COLUMN service_id SET NOT NULL;

-- Step 5: Ensure the selected vendor really belongs to that service.
ALTER TABLE public.event_vendors
ADD CONSTRAINT event_vendors_vendor_service_fk
FOREIGN KEY (vendor_id, service_id)
REFERENCES public.vendors (vendor_id, service_id);

-- Step 6: Allow only one vendor per service for each event.
ALTER TABLE public.event_vendors
ADD CONSTRAINT event_vendors_one_vendor_per_service
UNIQUE (event_id, service_id);

-- Backfill existing selections.
UPDATE public.event_vendors ev
SET service_id = v.service_id
FROM public.vendors v
WHERE v.vendor_id = ev.vendor_id;

-- Require a service for every selection.
ALTER TABLE public.event_vendors
ALTER COLUMN service_id SET NOT NULL;