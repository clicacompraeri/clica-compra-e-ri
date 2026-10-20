-- Clica, Compra e Ri — analytics storage. REVIEW ONLY: not yet applied.
-- No modifications to student, checkout, webhook, or support tables.
begin;
create table if not exists public.ccr_analytics_events (
 id bigint generated always as identity primary key,
 event_type text not null check(event_type in ('page_view','product_view','affiliate_outbound','course_checkout_click')),
 source text not null check(source in ('direct','google','facebook','instagram','other')),
 product text not null default '' check(char_length(product)<=80),
 store text not null default 'other' check(store in ('amazon','shopee','mercado_livre','aliexpress','hotmart','other')),
 occurred_at timestamptz not null default now()
);
create index if not exists ccr_analytics_occurred_idx on public.ccr_analytics_events(occurred_at desc);
alter table public.ccr_analytics_events enable row level security;
revoke all on table public.ccr_analytics_events from public, anon, authenticated;
grant select, insert, delete on public.ccr_analytics_events to service_role;
revoke all on sequence public.ccr_analytics_events_id_seq from public, anon, authenticated;
grant usage on sequence public.ccr_analytics_events_id_seq to service_role;

create table if not exists public.ccr_analytics_revoked_sessions (
 token_sha256 text primary key check(token_sha256 ~ '^[0-9a-f]{64}$'),
 expires_at timestamptz not null
);
create index if not exists ccr_analytics_revoked_exp_idx on public.ccr_analytics_revoked_sessions(expires_at);
alter table public.ccr_analytics_revoked_sessions enable row level security;
revoke all on table public.ccr_analytics_revoked_sessions from public, anon, authenticated;
grant select, insert, delete on public.ccr_analytics_revoked_sessions to service_role;

-- Daily cap prevents unbounded anonymous-event storage and accidental charges.
create or replace function public.ccr_analytics_ingest(p_event_type text,p_source text,p_product text default '',p_store text default 'other')
returns boolean language plpgsql security definer set search_path='' as $$
declare day_utc date:=(now() at time zone 'UTC')::date;
begin
 if p_event_type is null or p_event_type not in ('page_view','product_view','affiliate_outbound','course_checkout_click')
 or p_source is null or p_source not in ('direct','google','facebook','instagram','other')
 or p_product is null or char_length(p_product)>80
 or p_product ~* '(@|https?:|www\.|/|\\)'
 or p_store is null or p_store not in ('amazon','shopee','mercado_livre','aliexpress','hotmart','other')
 then return false; end if;
 perform pg_catalog.pg_advisory_xact_lock(52138,(day_utc-date '2000-01-01')::integer);
 if (select count(*) from public.ccr_analytics_events
 where occurred_at >=(day_utc::timestamp at time zone 'UTC')
 and occurred_at <((day_utc+1)::timestamp at time zone 'UTC'))>=5000 then return false; end if;
 insert into public.ccr_analytics_events(event_type,source,product,store)values(p_event_type,p_source,p_product,p_store);
 return true;
end;$$;
revoke execute on function public.ccr_analytics_ingest(text,text,text,text) from public,anon,authenticated;
grant execute on function public.ccr_analytics_ingest(text,text,text,text) to service_role;

create or replace function public.ccr_analytics_report(p_days integer default 7)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; today_utc date:=(now() at time zone 'UTC')::date; start_utc date;
begin
 if p_days is null or p_days not in (1,7,30) then raise exception 'Invalid reporting period'; end if;
 start_utc:=today_utc-(p_days-1);
 with selected as (
  select event_type,source,product,store,(occurred_at at time zone 'UTC')::date as day
  from public.ccr_analytics_events where occurred_at >=(start_utc::timestamp at time zone 'UTC') and occurred_at <=now()
 ), daily as (
  select d.day::date as day,
  count(s.event_type) filter(where s.event_type='page_view') as page_views,
  count(s.event_type) filter(where s.event_type='product_view') as product_views,
  count(s.event_type) filter(where s.event_type='affiliate_outbound') as outbound_clicks,
  count(s.event_type) filter(where s.event_type='course_checkout_click') as checkout_clicks
  from pg_catalog.generate_series(start_utc::timestamp,today_utc::timestamp,interval '1 day')d(day)
  left join selected s on s.day=d.day::date group by d.day
 ), sources as(select source as name,count(*) as value from selected group by source order by value desc),
 products as(select product as name,count(*) as value from selected where product<>'' and event_type='product_view' group by product order by value desc limit 25),
 stores as(select store as name,count(*) as value from selected where event_type='affiliate_outbound' group by store order by value desc)
 select pg_catalog.jsonb_build_object('simulation',false,'days',p_days,
 'metrics',pg_catalog.jsonb_build_object(
  'pageViews',(select count(*) from selected where event_type='page_view'),
  'productViews',(select count(*) from selected where event_type='product_view'),
  'outboundClicks',(select count(*) from selected where event_type='affiliate_outbound'),
  'courseCheckoutClicks',(select count(*) from selected where event_type='course_checkout_click')),
 'daily',(select pg_catalog.coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('date',day::text,'pageViews',page_views,'productViews',product_views,'outboundClicks',outbound_clicks,'courseCheckoutClicks',checkout_clicks)order by day),'[]'::jsonb)from daily),
 'sources',(select pg_catalog.coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('name',name,'value',value)),'[]'::jsonb)from sources),
 'products',(select pg_catalog.coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('name',name,'value',value)),'[]'::jsonb)from products),
 'stores',(select pg_catalog.coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('name',name,'value',value)),'[]'::jsonb)from stores)
 )into result;
 return result;
end;$$;
revoke execute on function public.ccr_analytics_report(integer) from public,anon,authenticated;
grant execute on function public.ccr_analytics_report(integer) to service_role;

create or replace function public.ccr_analytics_purge()
returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 delete from public.ccr_analytics_events where occurred_at <now()-interval '30 days';
 get diagnostics n=row_count;
 delete from public.ccr_analytics_revoked_sessions where expires_at<now();
 return n;
end;$$;
revoke execute on function public.ccr_analytics_purge() from public,anon,authenticated;
grant execute on function public.ccr_analytics_purge() to service_role;
commit;
