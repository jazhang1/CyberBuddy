-- Grants the project owner admin access to the new /admin page.
insert into public.admin_users (user_id)
select id from auth.users where email = 'ja.zhang4@gmail.com'
on conflict (user_id) do nothing;
