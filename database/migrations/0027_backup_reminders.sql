-- Somente aditiva. Aplicação no banco real requer aprovação do responsável.
CREATE TABLE backup_reminders (
 organization_id TEXT NOT NULL,id TEXT NOT NULL,
 period TEXT NOT NULL DEFAULT 'weekly' CHECK(period IN('weekly','fortnightly','monthly','off')),
 weekday INTEGER NOT NULL DEFAULT 1 CHECK(weekday BETWEEN 1 AND 7),
 time TEXT NOT NULL DEFAULT '09:00' CHECK(time GLOB '[0-2][0-9]:[0-5][0-9]' AND time<'24:00'),
 last_backup_at TEXT,snoozed_until TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 alert_key TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,mutation_id TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(organization_id,id),CHECK(id=organization_id),
 FOREIGN KEY(organization_id) REFERENCES organizations(id)
);
INSERT INTO backup_reminders(organization_id,id,last_backup_at,alert_key)
 SELECT o.id,o.id,(SELECT MAX(a.created_at) FROM audit_events a WHERE a.organization_id=o.id AND a.action='backup.export_requested'),lower(hex(randomblob(16))) FROM organizations o;
CREATE TRIGGER organization_backup_defaults AFTER INSERT ON organizations BEGIN
 INSERT INTO backup_reminders(organization_id,id,alert_key) VALUES(NEW.id,NEW.id,lower(hex(randomblob(16))));
END;
CREATE TABLE backup_exports (
 organization_id TEXT NOT NULL,id TEXT NOT NULL,user_id TEXT NOT NULL,
 requested_at TEXT NOT NULL,expires_at TEXT NOT NULL,completed_at TEXT,
 version INTEGER NOT NULL DEFAULT 1,mutation_id TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(organization_id,id),
 FOREIGN KEY(organization_id) REFERENCES organizations(id),
 FOREIGN KEY(user_id) REFERENCES users(id)
);
ALTER TABLE push_jobs ADD COLUMN backup_key TEXT;
CREATE UNIQUE INDEX push_backup_once ON push_jobs(organization_id,subscription_id,backup_key) WHERE backup_key IS NOT NULL;
