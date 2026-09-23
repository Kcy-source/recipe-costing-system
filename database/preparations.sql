-- Shared kitchen preparations: raw ingredients -> preparation -> dish.
create table public.preparations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  name_en text not null default '',
  category text not null default '',
  output_quantity numeric not null check (output_quantity > 0 and output_quantity < 'Infinity'::numeric),
  output_unit text not null check (btrim(output_unit) <> ''),
  method text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.preparation_ingredients (
  id uuid primary key default gen_random_uuid(),
  preparation_id uuid not null references public.preparations(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity numeric not null check (quantity > 0 and quantity < 'Infinity'::numeric),
  unit text not null check (btrim(unit) <> ''),
  waste_percent numeric not null default 0 check (waste_percent >= 0 and waste_percent < 100),
  sort_order integer not null default 0
);
create index preparation_ingredients_preparation_idx on public.preparation_ingredients(preparation_id);
create index preparation_ingredients_ingredient_idx on public.preparation_ingredients(ingredient_id);
alter table public.preparations enable row level security;
alter table public.preparation_ingredients enable row level security;
revoke all on public.preparations, public.preparation_ingredients from anon;
grant select, insert, update, delete on public.preparations, public.preparation_ingredients to authenticated;
create policy approved_preparations on public.preparations for all to authenticated
  using ((select public.is_active_app_user())) with check ((select public.is_active_app_user()));
create policy approved_preparation_ingredients on public.preparation_ingredients for all to authenticated
  using ((select public.is_active_app_user())) with check ((select public.is_active_app_user()));

alter table public.recipe_ingredients add column preparation_id uuid references public.preparations(id) on delete restrict;
create index recipe_ingredients_preparation_idx on public.recipe_ingredients(preparation_id);
alter table public.recipe_ingredients drop constraint recipe_ingredients_name_or_mapping_check;
alter table public.recipe_ingredients add constraint recipe_ingredients_name_or_mapping_check
  check (nullif(btrim(chef_name), '') is not null or ingredient_id is not null or preparation_id is not null);
alter table public.recipe_ingredients add constraint recipe_ingredients_one_source_check
  check (num_nonnulls(ingredient_id, preparation_id) <= 1);

-- Invoker functions keep existing account RLS and save headers + all lines atomically.
create function public.save_preparation(p_id uuid, p_data jsonb, p_items jsonb, p_expected_updated_at timestamptz default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_updated timestamptz;
begin
  if auth.uid() is null or not public.is_active_app_user() then raise exception '账号无权保存配方'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception '配方配料格式错误'; end if;
  if p_id is null then
    insert into public.preparations(name, name_en, category, output_quantity, output_unit, method, notes)
    values (btrim(p_data->>'name'), coalesce(p_data->>'name_en',''), coalesce(p_data->>'category',''),
      (p_data->>'output_quantity')::numeric, btrim(p_data->>'output_unit'), coalesce(p_data->>'method',''), coalesce(p_data->>'notes',''))
    returning id into v_id;
  else
    select updated_at into v_updated from public.preparations where id=p_id for update;
    if not found then raise exception '配方不存在或账号无权修改'; end if;
    if p_expected_updated_at is null or v_updated <> p_expected_updated_at then raise exception '配方已被修改，请重新打开后再保存'; end if;
    update public.preparations set name=btrim(p_data->>'name'), name_en=coalesce(p_data->>'name_en',''),
      category=coalesce(p_data->>'category',''), output_quantity=(p_data->>'output_quantity')::numeric,
      output_unit=btrim(p_data->>'output_unit'), method=coalesce(p_data->>'method',''), notes=coalesce(p_data->>'notes',''), updated_at=clock_timestamp()
      where id=p_id;
    v_id := p_id;
    delete from public.preparation_ingredients where preparation_id=v_id;
  end if;
  insert into public.preparation_ingredients(preparation_id, ingredient_id, quantity, unit, waste_percent, sort_order)
    select v_id, (x->>'ingredient_id')::uuid, (x->>'quantity')::numeric, btrim(x->>'unit'),
      coalesce((x->>'waste_percent')::numeric,0), ordinality::integer - 1
    from jsonb_array_elements(p_items) with ordinality as a(x,ordinality);
  return v_id;
end;
$$;
revoke all on function public.save_preparation(uuid,jsonb,jsonb,timestamptz) from public, anon;
grant execute on function public.save_preparation(uuid,jsonb,jsonb,timestamptz) to authenticated;

create function public.save_recipe_with_components(p_id uuid, p_data jsonb, p_items jsonb, p_expected_updated_at timestamptz default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_updated timestamptz;
begin
  if auth.uid() is null or not public.is_active_app_user() then raise exception '账号无权保存食谱'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception '食谱配料格式错误'; end if;
  if p_id is null then
    insert into public.recipes(code,name_cn,name_en,category_id,recipe_yield,yield_unit,selling_price,target_food_cost_percent,method,notes)
    values (nullif(btrim(p_data->>'code'),''),p_data->>'name_cn',coalesce(p_data->>'name_en',''),
      (p_data->>'category_id')::bigint,(p_data->>'recipe_yield')::numeric,p_data->>'yield_unit',
      (p_data->>'selling_price')::numeric,(p_data->>'target_food_cost_percent')::numeric,coalesce(p_data->>'method',''),coalesce(p_data->>'notes',''))
    returning id into v_id;
  else
    select updated_at into v_updated from public.recipes where id=p_id for update;
    if not found then raise exception '食谱不存在或账号无权修改'; end if;
    if p_expected_updated_at is null or v_updated <> p_expected_updated_at then raise exception '食谱已被修改，请重新打开后再保存'; end if;
    update public.recipes set code=nullif(btrim(p_data->>'code'),''),name_cn=p_data->>'name_cn',name_en=coalesce(p_data->>'name_en',''),
      category_id=(p_data->>'category_id')::bigint,recipe_yield=(p_data->>'recipe_yield')::numeric,yield_unit=p_data->>'yield_unit',
      selling_price=(p_data->>'selling_price')::numeric,target_food_cost_percent=(p_data->>'target_food_cost_percent')::numeric,
      method=coalesce(p_data->>'method',''),notes=coalesce(p_data->>'notes',''),updated_at=clock_timestamp() where id=p_id;
    v_id := p_id;
    delete from public.recipe_ingredients where recipe_id=v_id;
  end if;
  insert into public.recipe_ingredients(recipe_id,chef_name,ingredient_id,preparation_id,quantity,unit,waste_percent,sort_order)
    select v_id,nullif(btrim(x->>'chef_name'),''),nullif(x->>'ingredient_id','')::uuid,nullif(x->>'preparation_id','')::uuid,
      (x->>'quantity')::numeric,btrim(x->>'unit'),coalesce((x->>'waste_percent')::numeric,0),ordinality::integer - 1
    from jsonb_array_elements(p_items) with ordinality as a(x,ordinality);
  return v_id;
end;
$$;
revoke all on function public.save_recipe_with_components(uuid,jsonb,jsonb,timestamptz) from public, anon;
grant execute on function public.save_recipe_with_components(uuid,jsonb,jsonb,timestamptz) to authenticated;
notify pgrst, 'reload schema';
