CREATE TRIGGER auth_verification_owner_insert
BEFORE INSERT ON auth_verification
WHEN CASE WHEN json_valid(NEW.value) THEN json_extract(NEW.value,'$.link.userId') END IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM auth_user WHERE id=CASE WHEN json_valid(NEW.value) THEN json_extract(NEW.value,'$.link.userId') END)
BEGIN SELECT RAISE(ABORT,'Account no longer exists'); END;
--> statement-breakpoint
CREATE TRIGGER auth_account_rate_owner_insert
BEFORE INSERT ON auth_rate_limit
WHEN (substr(NEW.key,1,12)='google-link:' OR substr(NEW.key,1,7)='delete:')
AND NOT EXISTS (SELECT 1 FROM auth_user WHERE id=CASE WHEN substr(NEW.key,1,12)='google-link:' THEN substr(NEW.key,13) ELSE substr(NEW.key,8) END)
BEGIN SELECT RAISE(ABORT,'Account no longer exists'); END;
--> statement-breakpoint
CREATE TRIGGER auth_verification_owner_update
BEFORE UPDATE ON auth_verification
WHEN CASE WHEN json_valid(NEW.value) THEN json_extract(NEW.value,'$.link.userId') END IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM auth_user WHERE id=CASE WHEN json_valid(NEW.value) THEN json_extract(NEW.value,'$.link.userId') END)
BEGIN SELECT RAISE(ABORT,'Account no longer exists'); END;
--> statement-breakpoint
CREATE TRIGGER auth_account_rate_owner_update
BEFORE UPDATE ON auth_rate_limit
WHEN (substr(NEW.key,1,12)='google-link:' OR substr(NEW.key,1,7)='delete:')
AND NOT EXISTS (SELECT 1 FROM auth_user WHERE id=CASE WHEN substr(NEW.key,1,12)='google-link:' THEN substr(NEW.key,13) ELSE substr(NEW.key,8) END)
BEGIN SELECT RAISE(ABORT,'Account no longer exists'); END;
