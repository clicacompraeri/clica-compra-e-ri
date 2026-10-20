#!/usr/bin/env bash
# Disposable PostgreSQL CI test: never point this at production/Supabase.
set -euo pipefail
: "$PGPASSWORD"
run(){ psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -U ccrci -d ccr_analytics_ci "$@"; }
query(){ run -qAt -c "$1"; }

run -q -c "create role anon nologin; create role authenticated nologin; create role service_role nologin"
run -q -f drafts/admin-analytics/supabase-private-schema.sql
[[ "$(query "select relrowsecurity from pg_class where oid='public.ccr_analytics_events'::regclass")" == "t" ]]
[[ "$(query "select relrowsecurity from pg_class where oid='public.ccr_analytics_revoked_sessions'::regclass")" == "t" ]]

for role in anon authenticated; do
  if run -qAt -c "set role $role; select * from public.ccr_analytics_events limit 1" >/dev/null 2>&1; then
    echo "ERROR: $role could read private event table"; exit 1
  fi
  if run -qAt -c "set role $role; select public.ccr_analytics_report(7)" >/dev/null 2>&1; then
    echo "ERROR: $role could call private report RPC"; exit 1
  fi
  if run -qAt -c "set role $role; insert into public.ccr_analytics_events(event_type,source) values ('page_view','direct')" >/dev/null 2>&1; then
    echo "ERROR: $role could insert event"; exit 1
  fi
done

[[ "$(query "set role service_role; select public.ccr_analytics_ingest('page_view','direct','','other')")" == "t" ]]
[[ "$(query "set role service_role; select public.ccr_analytics_ingest('page_view','direct','contact@private.invalid','other')")" == "f" ]]
[[ "$(query "set role service_role; select public.ccr_analytics_ingest('unknown','direct','','other')")" == "f" ]]
[[ "$(query "set role service_role; select (public.ccr_analytics_report(7)->'metrics'->>'pageViews')::int")" == "1" ]]
[[ "$(query "set role service_role; select jsonb_array_length(public.ccr_analytics_report(30)->'daily')")" == "30" ]]
[[ "$(query "set role service_role; select jsonb_array_length(public.ccr_analytics_report(1)->'daily')")" == "1" ]]

run -q -c "insert into public.ccr_analytics_events(event_type,source,occurred_at) values ('page_view','direct',now()-interval '31 days')"
[[ "$(query "set role service_role; select public.ccr_analytics_purge()")" == "1" ]]
[[ "$(query "select count(*) from public.ccr_analytics_events")" == "1" ]]

# Efficiently reach the daily cap without 4,999 HTTP calls.
run -q -c "insert into public.ccr_analytics_events(event_type,source) select 'page_view','direct' from generate_series(1,4999)"
[[ "$(query "set role service_role; select public.ccr_analytics_ingest('page_view','direct','','other')")" == "f" ]]
[[ "$(query "set role service_role; select (public.ccr_analytics_report(7)->'metrics'->>'pageViews')::int")" == "5000" ]]
echo "SUCCESS: isolated PostgreSQL RLS, report, retention, validation and 5k daily cap"
