-- Configuração aditiva. Lembretes existentes continuam sem aviso automático.
CREATE TABLE reminder_alerts (
 organization_id TEXT NOT NULL, reminder_id TEXT NOT NULL,
 alert_at TEXT, schedule_key TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(organization_id,reminder_id),
 FOREIGN KEY(organization_id,reminder_id) REFERENCES reminders(organization_id,id) ON DELETE CASCADE
);
CREATE TABLE reminder_recipients (
 organization_id TEXT NOT NULL, reminder_id TEXT NOT NULL, user_id TEXT NOT NULL,
 PRIMARY KEY(organization_id,reminder_id,user_id),
 FOREIGN KEY(organization_id,reminder_id) REFERENCES reminders(organization_id,id) ON DELETE CASCADE,
 FOREIGN KEY(organization_id,user_id) REFERENCES memberships(organization_id,user_id) ON DELETE CASCADE
);
CREATE TABLE push_subscriptions (
 organization_id TEXT NOT NULL, id TEXT NOT NULL, user_id TEXT NOT NULL,
 session_hash TEXT NOT NULL, endpoint_hash TEXT NOT NULL UNIQUE,
 subscription TEXT NOT NULL CHECK(json_valid(subscription)),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 created_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,mutation_id TEXT NOT NULL,
 PRIMARY KEY(organization_id,id),
 FOREIGN KEY(organization_id,user_id) REFERENCES memberships(organization_id,user_id) ON DELETE CASCADE
);
CREATE INDEX push_user ON push_subscriptions(organization_id,user_id,active);
CREATE TABLE push_jobs (
 organization_id TEXT NOT NULL,id TEXT NOT NULL,subscription_id TEXT NOT NULL,
 reminder_id TEXT,schedule_key TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN('pending','processing','sent','failed','unknown','cancelled')),
 claim_nonce TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,attempted_at TEXT,
 status_code INTEGER,mutation_id TEXT NOT NULL,
 PRIMARY KEY(organization_id,id),
 UNIQUE(organization_id,subscription_id,reminder_id,schedule_key),
 FOREIGN KEY(organization_id,subscription_id) REFERENCES push_subscriptions(organization_id,id) ON DELETE CASCADE,
 FOREIGN KEY(organization_id,reminder_id) REFERENCES reminders(organization_id,id)
);
CREATE INDEX push_pending ON push_jobs(state,created_at);
CREATE TABLE push_requests (
 organization_id TEXT NOT NULL,request_key TEXT NOT NULL,request_hash TEXT NOT NULL,response TEXT NOT NULL CHECK(json_valid(response)),
 PRIMARY KEY(organization_id,request_key),FOREIGN KEY(organization_id) REFERENCES organizations(id)
);
