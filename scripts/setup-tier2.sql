-- Row Level Security Policies for Tier 2 Modules
-- Run this after pushing the schema changes

-- Library Management
ALTER TABLE "Book" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_book ON "Book" USING ("tenantId"::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE "BookTransaction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_book_transaction ON "BookTransaction" USING ("tenantId"::text = current_setting('app.current_tenant', TRUE));

-- Transport Management
ALTER TABLE "Bus" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_bus ON "Bus" USING ("tenantId"::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE "BusRoute" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_bus_route ON "BusRoute" USING ("tenantId"::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE "BusAssignment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_bus_assignment ON "BusAssignment" USING ("tenantId"::text = current_setting('app.current_tenant', TRUE));

-- Inventory Management
ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_asset ON "Asset" USING ("tenantId"::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE "AssetTransaction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_asset_transaction ON "AssetTransaction" USING ("tenantId"::text = current_setting('app.current_tenant', TRUE));

-- Event Management
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_event ON "Event" USING ("tenantId"::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE "EventParticipant" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_event_participant ON "EventParticipant" USING ("tenantId"::text = current_setting('app.current_tenant', TRUE));

-- Disciplinary Management
ALTER TABLE "DisciplinaryRecord" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_disciplinary_record ON "DisciplinaryRecord" USING ("tenantId"::text = current_setting('app.current_tenant', TRUE));

-- Health Records
ALTER TABLE "HealthRecord" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_health_record ON "HealthRecord" USING ("tenantId"::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE "MedicalIncident" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_medical_incident ON "MedicalIncident" USING ("tenantId"::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE "Vaccination" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_vaccination ON "Vaccination" USING ("tenantId"::text = current_setting('app.current_tenant', TRUE));
