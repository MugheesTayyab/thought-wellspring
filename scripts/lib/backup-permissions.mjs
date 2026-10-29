export async function backupPermissions(client) {
  const tables = (
    await client.query(`SELECT c.relname AS name,c.relowner::regrole::text AS owner,c.relrowsecurity AS rls_enabled,c.relforcerowsecurity AS rls_forced,r.rolname AS role,
    has_table_privilege(r.rolname,c.oid,'SELECT') AS select,
    has_table_privilege(r.rolname,c.oid,'INSERT') AS insert,
    has_table_privilege(r.rolname,c.oid,'UPDATE') AS update,
    has_table_privilege(r.rolname,c.oid,'DELETE') AS delete
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN pg_roles r
    WHERE n.nspname='public' AND c.relkind IN ('r','v') AND r.rolname IN ('anon','authenticated','service_role')
    ORDER BY c.relname,r.rolname`)
  ).rows;
  const functions = (
    await client.query(`SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS name,p.proowner::regrole::text AS owner,p.prosecdef AS security_definer,
    r.rolname AS role,has_function_privilege(r.rolname,p.oid,'EXECUTE') AS execute
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN pg_roles r
    WHERE n.nspname='public' AND r.rolname IN ('anon','authenticated','service_role')
    ORDER BY name,r.rolname`)
  ).rows;
  return { tables, functions };
}
