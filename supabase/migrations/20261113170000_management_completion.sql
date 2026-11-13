-- Allow an owner to submit requested corrections, while preserving approval controls.
create or replace function private.protect_business_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if private.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.featured := false;
    new.approved_at := null;
    new.approved_by := null;
    new.contact_verified := false;
    new.owner_verified := false;
    if exists (select 1 from public.site_settings where id = 1 and moderate_business_signups) then
      new.status := 'pending';
    else
      new.status := 'active'; new.approved_at := now();
    end if;
  elsif tg_op = 'UPDATE' then
    new.featured := old.featured;
    new.approved_at := old.approved_at;
    new.approved_by := old.approved_by;
    new.contact_verified := old.contact_verified;
    new.owner_verified := old.owner_verified;
    if not (old.status = 'adjustments_requested' and new.status = 'pending') then
      new.status := old.status;
    end if;
    new.adjustment_notes := old.adjustment_notes;
  end if;
  return new;
end;
$$;
