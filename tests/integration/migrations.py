"""Valida SQL local com fixtures fictícias isoladas em SQLite na memória."""
import sqlite3
import unittest
from pathlib import Path


class IdentityMigrationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        for migration in sorted(Path('database/migrations').glob('*.sql')):
            self.db.executescript(migration.read_text())
        self.db.execute("INSERT INTO organizations(id,name) VALUES('demo-org','Organização de demonstração')")
        self.db.execute("INSERT INTO organizations(id,name) VALUES('demo-other','Outra organização de demonstração')")
        self.db.execute("INSERT INTO users(id,identity_subject) VALUES('demo-user','demo-subject')")
        self.db.execute("INSERT INTO memberships VALUES('demo-org','demo-user','owner')")

    def tearDown(self):
        self.db.close()

    def test_valid_session(self):
        self.db.execute("INSERT INTO sessions VALUES('demo-hash','demo-org','demo-user',100)")
        self.assertEqual(self.db.execute('SELECT count(*) FROM sessions').fetchone()[0], 1)

    def test_session_requires_membership_in_same_organization(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO sessions VALUES('demo-hash','demo-other','demo-user',100)")

    def test_unknown_role_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO memberships VALUES('demo-other','demo-user','visitor')")

    def test_duplicate_membership_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO memberships VALUES('demo-org','demo-user','operator')")

    def test_unknown_organization_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO memberships VALUES('missing','demo-user','operator')")

    def test_removing_membership_revokes_sessions(self):
        self.db.execute("INSERT INTO sessions VALUES('demo-hash','demo-org','demo-user',100)")
        self.db.execute("DELETE FROM memberships WHERE organization_id='demo-org'")
        self.assertEqual(self.db.execute('SELECT count(*) FROM sessions').fetchone()[0], 0)


if __name__ == '__main__':
    unittest.main()
