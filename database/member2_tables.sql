create table services (
    service_id bigint generated always as identity primary key,
    service_name varchar(100) not null
);

create table vendors (
    vendor_id bigint generated always as identity primary key,
    vendor_name varchar(150) not null,
    service_id bigint not null,
    service_description text,
    phone varchar(20),
    email varchar(150),
    created_at timestamptz not null default now(),

    constraint fk_vendors_service
        foreign key (service_id)
        references services(service_id)
        on delete restrict
);

create table events (
    event_id bigint generated always as identity primary key,
    title varchar(150) not null,
    description text,
    organizer_id uuid not null,
    category_id bigint,
    venue_id bigint,
    start_time timestamptz not null,
    end_time timestamptz not null,
    ticket_price numeric not null default 0,
    capacity integer not null,
    status text not null default 'draft',
    created_at timestamptz not null default now(),

    constraint fk_events_organizer
        foreign key (organizer_id)
        references auth.users(id),

    constraint fk_events_category
        foreign key (category_id)
        references categories(category_id),

    constraint fk_events_venue
        foreign key (venue_id)
        references venues(venue_id)
);

create table event_vendors (
    event_id bigint not null,
    vendor_id bigint not null,
    agreed_cost numeric not null default 0,
    booking_status text not null default 'requested',
    created_at timestamptz not null default now(),

    primary key (event_id, vendor_id),

    constraint fk_event_vendors_event
        foreign key (event_id)
        references events(event_id)
        on delete cascade,

    constraint fk_event_vendors_vendor
        foreign key (vendor_id)
        references vendors(vendor_id)
        on delete cascade
);

create table ticket_type (
    ticket_type_id bigint generated always as identity primary key,
    event_id bigint not null,
    type_name varchar(50) not null,
    price numeric(10,2) not null,
    quantity_available integer not null,

    constraint fk_ticket_type_event
        foreign key (event_id)
        references events(event_id)
        on delete cascade,

    constraint chk_ticket_type_price
        check (price >= 0),

    constraint chk_ticket_type_quantity
        check (quantity_available >= 0),

    constraint uq_ticket_type_event_name
        unique (event_id, type_name)
);