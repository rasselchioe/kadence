-- Keep the SECURITY DEFINER trigger function off the exposed PostgREST API.
-- The trigger still fires (it runs as the owner); this only prevents the
-- function from being invoked directly via /rest/v1/rpc. Clears Supabase
-- security advisor lints 0028/0029.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
