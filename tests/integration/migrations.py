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


class KitExpansionTests(unittest.TestCase):
    def test_expansion_preserves_catalog_and_constraints(self):
        db = sqlite3.connect(':memory:')
        for migration in sorted(Path('database/migrations').glob('*.sql')):
            if migration.name.startswith('0020'):
                break
            db.executescript(migration.read_text())
        db.execute("INSERT INTO organizations(id,name) VALUES('demo-org','DEMONSTRAÇÃO')")
        db.execute("INSERT INTO kits(organization_id,id,weight_grams,dough_weight_grams,units_per_kit,price_cents,max_flavors,version,mutation_id) VALUES('demo-org','demo-kit',30,26,12,12345,3,7,'demo-mutation')")
        db.execute("INSERT INTO kit_settings VALUES('demo-org','demo-org',0,4,'demo-setting')")
        before = db.execute('SELECT * FROM kits').fetchall()
        settings = db.execute('SELECT * FROM kit_settings').fetchall()
        db.executescript(Path('database/migrations/0020_kit_order_items.sql').read_text())
        self.assertEqual(db.execute('SELECT * FROM kits').fetchall(), before)
        self.assertEqual(db.execute('SELECT * FROM kit_settings').fetchall(), settings)
        db.execute("INSERT INTO kits(organization_id,id,weight_grams,units_per_kit,price_cents,max_flavors,mutation_id) VALUES('demo-org','demo-small',20,6,500,6,'demo')")
        for weight, capacity in [(0, 6), (501, 6), (20, 0), (20, 501)]:
            with self.assertRaises(sqlite3.IntegrityError):
                db.execute("INSERT INTO kits(organization_id,id,weight_grams,units_per_kit,price_cents,max_flavors,mutation_id) VALUES('demo-org','demo-bad',?,?,500,1,'demo')", (weight, capacity))
        self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(), [])
        plan = db.execute("EXPLAIN QUERY PLAN SELECT * FROM kit_order_items WHERE organization_id=? AND order_id=?", ('demo-org', 'demo-order')).fetchall()
        self.assertTrue(any('kit_order_items_order' in row[-1] for row in plan))
        deletion = db.execute("EXPLAIN QUERY PLAN DELETE FROM kit_order_items WHERE organization_id=? AND order_id=?", ('demo-org', 'demo-order')).fetchall()
        self.assertTrue(any('kit_order_items_order' in row[-1] for row in deletion))
        db.close()





class ProspectMigrationTests(unittest.TestCase):
    def test_prospects_is_additive_and_tenant_scoped(self):
        db = sqlite3.connect(':memory:')
        db.execute('PRAGMA foreign_keys=ON')
        for migration in sorted(Path('database/migrations').glob('*.sql')):
            if migration.name.startswith('0024'):
                break
            db.executescript(migration.read_text())
        db.execute("INSERT INTO organizations(id,name) VALUES('demo-org','DEMONSTRAÇÃO')")
        db.execute("INSERT INTO customers(organization_id,id,name,phone,version) VALUES('demo-org','demo-customer','DEMONSTRAÇÃO','sem:demo-customer',7)")
        db.executescript(Path('database/migrations/0024_prospects.sql').read_text())
        self.assertEqual(db.execute("SELECT kind,version,name FROM customers").fetchone(), ('customer',7,'DEMONSTRAÇÃO'))
        self.assertEqual(db.execute('SELECT COUNT(*) FROM prospect_details').fetchone()[0],0)
        self.assertEqual(db.execute('SELECT COUNT(*) FROM prospect_events').fetchone()[0],0)
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute("INSERT INTO prospect_details VALUES('outra-org','demo-customer','{}')")
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute("UPDATE customers SET kind='invalido'")
        self.assertEqual(list(db.execute('PRAGMA foreign_key_check')), [])
        db.close()

if __name__ == '__main__':
    unittest.main()
