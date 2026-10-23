-- EVENTS
alter table events
add constraint events_capacity_positive
check (capacity > 0);

-- BOOKINGS
alter table bookings
add constraint bookings_ticket_quantity_positive
check (ticket_quantity > 0);

alter table bookings
add constraint bookings_total_amount_positive
check (total_amount >= 0);


-- PAYMENTS
alter table payments
add constraint payments_amount_positive
check (amount >= 0);

alter table payments
add constraint payments_status_check
check (payment_status in ('PENDING', 'PAID', 'FAILED', 'REFUNDED'));