CREATE TABLE feedback_messages (
 organization_id TEXT NOT NULL,
 id TEXT NOT NULL,
 author_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('suggestion','problem','praise')),
 message TEXT NOT NULL CHECK(length(trim(message)) BETWEEN 1 AND 2000),
 context TEXT CHECK(context IS NULL OR (length(context)<=512 AND json_valid(context))),
 read_at TEXT,
 created_at TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 mutation_id TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(organization_id,id),
 FOREIGN KEY(organization_id) REFERENCES organizations(id),
 FOREIGN KEY(author_id) REFERENCES users(id)
);
CREATE INDEX feedback_inbox ON feedback_messages(organization_id,read_at,created_at DESC,id);
CREATE INDEX feedback_author ON feedback_messages(organization_id,author_id,created_at DESC,id);

CREATE TABLE feedback_contact_profiles (
 organization_id TEXT NOT NULL,
 user_id TEXT NOT NULL,
 phone TEXT NOT NULL CHECK(length(phone) BETWEEN 12 AND 13 AND phone NOT GLOB '*[^0-9]*'),
 PRIMARY KEY(organization_id,user_id),
 FOREIGN KEY(organization_id,user_id) REFERENCES memberships(organization_id,user_id) ON DELETE CASCADE
);

ALTER TABLE push_jobs ADD COLUMN feedback_id TEXT;
CREATE UNIQUE INDEX push_feedback_once ON push_jobs(organization_id,subscription_id,feedback_id) WHERE feedback_id IS NOT NULL;
CREATE INDEX feedback_push_pending ON feedback_messages(created_at) WHERE read_at IS NULL;
