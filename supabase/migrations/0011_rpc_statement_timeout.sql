-- Fix: the nightly sync calls refresh_card_cheapest() via PostgREST (as the
-- service_role). API requests run under a statement timeout, and recomputing
-- cheapest prices across ~100k printings exceeds the default — so it gets
-- cancelled. Raise the timeout for service_role so the maintenance RPC can
-- finish. (Supabase honors per-role statement_timeout for API requests.)

alter role service_role set statement_timeout = '180s';

-- Tell PostgREST to pick up the changed role config.
notify pgrst, 'reload config';
