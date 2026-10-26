-- Intégrité du vote et des journaux : insertion seule.
-- Aucun UPDATE ni DELETE n'est possible sur les suffrages, les invalidations et les journaux,
-- y compris depuis l'administration. Une invalidation est une ligne ajoutée, motivée et attribuée.
CREATE OR REPLACE FUNCTION gdl_forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Table % en insertion seule : % interdit', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER votes_immutable BEFORE UPDATE OR DELETE ON "votes"
  FOR EACH ROW EXECUTE FUNCTION gdl_forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER vote_invalidations_immutable BEFORE UPDATE OR DELETE ON "vote_invalidations"
  FOR EACH ROW EXECUTE FUNCTION gdl_forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER vote_events_immutable BEFORE UPDATE OR DELETE ON "vote_events"
  FOR EACH ROW EXECUTE FUNCTION gdl_forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_logs_immutable BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION gdl_forbid_mutation();
--> statement-breakpoint
-- Un candidat ne peut recevoir un vote que pour sa propre édition.
CREATE OR REPLACE FUNCTION gdl_vote_edition_check() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM candidates c WHERE c.id = NEW.candidate_id AND c.edition_id = NEW.edition_id
  ) THEN
    RAISE EXCEPTION 'Le candidat ne participe pas à cette édition';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER votes_edition_check BEFORE INSERT ON "votes"
  FOR EACH ROW EXECUTE FUNCTION gdl_vote_edition_check();
--> statement-breakpoint
-- Une seule édition « en cours » à la fois.
CREATE UNIQUE INDEX IF NOT EXISTS editions_single_current ON "editions" ((status)) WHERE status = 'en_cours';
