-- À exécuter UNE FOIS dans Supabase (SQL Editor), après `npm run db:migrate`.
--
-- L'application accède à la base uniquement côté serveur, via DATABASE_URL (rôle propriétaire).
-- L'API publique de Supabase (PostgREST, clé « anon ») ne doit donc rien exposer :
-- on active la Row Level Security sur toutes les tables SANS aucune politique pour anon/authenticated,
-- ce qui revient à tout refuser à ces rôles. La clé anon peut même rester inutilisée.

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END $$;

-- Les migrations Drizzle sont suivies dans le schéma « drizzle » : on le ferme aussi.
REVOKE ALL ON ALL TABLES IN SCHEMA drizzle FROM anon, authenticated;

-- Stockage : un bucket public pour les médias publiés, un bucket privé pour les pièces des dossiers.
INSERT INTO storage.buckets (id, name, public) VALUES ('public-media', 'public-media', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('dossiers', 'dossiers', false)
  ON CONFLICT (id) DO UPDATE SET public = false;
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', false)
  ON CONFLICT (id) DO UPDATE SET public = false;
-- Aucune politique n'est créée sur storage.objects pour ces buckets : seul le serveur
-- (clé service_role, jamais envoyée au navigateur) peut y écrire ou lire les dossiers privés.
