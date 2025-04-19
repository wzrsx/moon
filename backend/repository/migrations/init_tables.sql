-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50),
    email VARCHAR(100),
    password VARCHAR(100)
);

CREATE TABLE maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    CONSTRAINT fk_maps_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE modules(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    map_id UUID NOT NULL,
    module_type VARCHAR(40),
    module_name VARCHAR(40),
    module_points_json JSONB,
    
    CONSTRAINT fk_modules_maps FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE
);

CREATE TABLE module_requirements (
    id SERIAL NOT NULL,
    module_type character varying(50) NOT NULL,
    max_slope_degrees integer DEFAULT 15 NOT NULL,
    width_meters integer NOT NULL,
    length_meters integer NOT NULL,
    min_distance_from_living integer,
    max_distance_from_living integer,
    min_distance_between_modules integer,
    min_distance_from_production integer,
    max_distance_from_production integer,
    min_distance_from_spaceport integer,
    max_distance_from_spaceport integer,
    is_hazardous boolean DEFAULT false
);

INSERT INTO module_requirements (
    module_type,
    max_slope_degrees,
    width_meters,
    length_meters,
    min_distance_from_living,
    max_distance_from_living,
    min_distance_between_modules,
    min_distance_from_production,
    max_distance_from_production,
    min_distance_from_spaceport,
    max_distance_from_spaceport,
    is_hazardous
) VALUES
('spaceport_module', 15, 50, 40, 2000, NULL, 500, NULL, NULL, NULL, NULL, TRUE),
('landfill_module', 15, 50, 40, 2000, NULL, 500, NULL, NULL, NULL, NULL, TRUE),
('production_module', 15, 70, 30, 2000, NULL, 500, NULL, NULL, NULL, NULL, TRUE),
('astro_site_module', 15, 20, 15, 2000, NULL, 500, NULL, NULL, NULL, NULL, TRUE),
('mine_module', 15, 30, 20, 1000, NULL, 300, NULL, NULL, NULL, NULL, TRUE),
('communication_tower_module', 15, 10, 10, 200, NULL, NULL, 750, NULL, NULL, NULL, FALSE),
('solar_power_module', 15, 50, 30, 300, NULL, NULL, 750, NULL, NULL, NULL, FALSE),
('living_module', 15, 5, 3, 10, NULL, 10, NULL, NULL, NULL, NULL, FALSE),
('sport_module', 15, 15, 10, 10, 150, NULL, NULL, NULL, NULL, NULL, FALSE),
('administrative_module', 15, 12, 8, 10, 100, NULL, NULL, NULL, NULL, NULL, FALSE),
('medical_module', 15, 20, 10, 10, 100, NULL, NULL, NULL, NULL, NULL, FALSE),
('research_module', 15, 25, 12, 10, 150, NULL, NULL, NULL, NULL, NULL, FALSE),
('repair_module', 15, 30, 15, 500, NULL, NULL, NULL, 200, NULL, 200, FALSE),
('plantation_module', 15, 50, 30, 500, 200, NULL, NULL, NULL, NULL, NULL, FALSE);

ALTER TABLE modules ADD CONSTRAINT modules_module_name_check
CHECK (
    (module_type = 'inhabited' AND module_name = ANY(
        ARRAY['living_module', 'sport_module', 'administrative_module', 
              'medical_module', 'research_module']
    ))
    OR
    (module_type = 'technological' AND module_name = ANY(
        ARRAY['repair_module', 'spaceport_module', 'communication_tower_module', 
              'plantation_module', 'landfill_module', 'production_module', 'astro_site_module', 
              'solar_power_module', 'mine_module']
    ))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_maps_user_id ON maps(user_id);
CREATE INDEX IF NOT EXISTS idx_modeules_maps_id ON modules(map_id);


