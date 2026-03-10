  -- The trigger function that runs when a new auth user is created
  create or replace function public.handle_new_user()
  returns trigger as $$
  begin
    insert into public.profiles (id, email, full_name)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', '')
    );
    return new;
  end;
  $$ language plpgsql security definer;

  -- Attach the trigger to auth.users
  -- AFTER INSERT means it runs after the auth.users row is committed,
  -- ensuring the FK reference from profiles.id → auth.users.id is valid.
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();