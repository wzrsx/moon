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
    id SERIAL PRIMARY KEY,
    module_type VARCHAR(50) NOT NULL,
    max_slope_degrees INT NOT NULL DEFAULT 15,
    width_meters INT NOT NULL,
    length_meters INT NOT NULL,
    min_distance_from_living INT,
    max_distance_from_living INT,
    min_distance_between_modules INT
);

-- Заполняем требования для каждого типа модуля
INSERT INTO module_requirements (module_type, width_meters, length_meters, min_distance_from_living, max_distance_from_living, min_distance_between_modules)
VALUES 
    ('living_module', 5, 3, NULL, NULL, 10),
    ('sport_module', 15, 10, NULL, 150, NULL),
    ('administrative_module', 12, 8, NULL, 100, NULL),
    ('medical_module', 20, 10, NULL, 100, NULL),
    ('research_module', 25, 12, NULL, 150, NULL);

ALTER TABLE modules ADD CONSTRAINT modules_module_name_check
CHECK (
    (module_type = 'inhabited' AND module_name = ANY(
        ARRAY['living_module', 'sport_module', 'administration_module', 
              'medical_module', 'exploring_module']
    ))
    OR
    (module_type = 'technological' AND module_name = ANY(
        ARRAY['repair_module', 'cosmodrome', 'communication_tower', 
              'plantation', 'landfill', 'production', 'astro_platform', 
              'sun_electronic_station', 'mine']
    ))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_maps_user_id ON maps(user_id);
CREATE INDEX IF NOT EXISTS idx_modeules_maps_id ON modules(map_id);


