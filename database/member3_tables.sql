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