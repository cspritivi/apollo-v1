 -- ============================================================================
  -- MEASUREMENT HISTORY
  -- Automatically logs every update to the measurements table so the tailor
  -- can recover previous values if a customer makes a mistake.
  -- The trigger fires BEFORE the update and saves a snapshot of the old row.
  -- ============================================================================

  create table public.measurement_history (
    id uuid primary key default gen_random_uuid(),
    measurement_id uuid not null references public.measurements(id) on delete cascade,
    profile_id uuid not null,

    -- Snapshot of the old values before the update
    label text not null,
    unit text not null,
    chest numeric not null,
    waist numeric not null,
    hips numeric not null,
    shoulder_width numeric not null,
    sleeve_length numeric not null,
    shirt_length numeric not null,
    inseam numeric not null,
    outseam numeric not null,
    thigh numeric not null,
    neck numeric not null,
    notes text,

    changed_at timestamptz not null default now()
  );

  -- Trigger function: copies the OLD row into measurement_history before update
  create or replace function public.log_measurement_change()
  returns trigger as $$
  begin
    insert into public.measurement_history (
      measurement_id, profile_id,
      label, unit, chest, waist, hips, shoulder_width,
      sleeve_length, shirt_length, inseam, outseam, thigh, neck, notes
    ) values (
      old.id, old.profile_id,
      old.label, old.unit, old.chest, old.waist, old.hips, old.shoulder_width,
      old.sleeve_length, old.shirt_length, old.inseam, old.outseam, old.thigh,
      old.neck, old.notes
    );
    return new;
  end;
  $$ language plpgsql;

  create trigger trg_log_measurement_change
    before update on public.measurements
    for each row execute function public.log_measurement_change();

  -- RLS: customers can view their own history, only admin can modify
  alter table public.measurement_history enable row level security;

  create policy "Users can read own measurement history"
    on public.measurement_history for select
    using (auth.uid() = profile_id);

  -- No insert/update/delete policies for customers.
  -- Only the trigger (runs as definer) and the admin (service role) can write.

  -- Index for looking up history by measurement
  create index idx_measurement_history_measurement_id
    on public.measurement_history(measurement_id);
