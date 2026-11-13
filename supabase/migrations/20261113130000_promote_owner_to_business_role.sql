create or replace function private.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('guia.bypass_profile_guard', true) = 'on' then
    return new;
  end if;
  if private.is_admin() then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    new.role := old.role;
    new.status := old.status;
    new.suspension_reason := old.suspension_reason;
    new.email := old.email;
  end if;
  return new;
end;
$$;

create or replace function private.promote_owner_to_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null then
    perform set_config('guia.bypass_profile_guard', 'on', true);
    update public.profiles
       set role = 'business'
     where id = new.owner_id
       and role = 'client';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_promote_owner_to_business on public.businesses;
create trigger trg_promote_owner_to_business
  after insert on public.businesses
  for each row execute function private.promote_owner_to_business();
