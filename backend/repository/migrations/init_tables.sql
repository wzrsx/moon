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

CREATE TABLE module_requirements
(
    id serial NOT NULL,
    module_type VARCHAR(50) NOT NULL,
    max_slope_degrees integer NOT NULL DEFAULT 15,
    width_meters integer NOT NULL,
    length_meters integer NOT NULL,
    CONSTRAINT module_requirements_pkey PRIMARY KEY (module_type)   
);

CREATE TABLE module_distance_rules
(
    id serial NOT NULL,
    module_type_1 VARCHAR(50) REFERENCES module_requirements(module_type) ON DELETE CASCADE,
    module_type_2 VARCHAR(50) REFERENCES module_requirements(module_type) ON DELETE CASCADE,
    min_distance integer NOT NULL,
    max_distance integer,
    CONSTRAINT module_distance_rules_pkey PRIMARY KEY (id)
);


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

INSERT INTO module_requirements (
    module_type,
    max_slope_degrees,
    width_meters,
    length_meters
) VALUES
('spaceport_module', 15, 50, 40),
('landfill_module', 15, 50, 40),
('production_module', 15, 70, 30),
('astro_site_module', 15, 20, 15),
('mine_module', 15, 30, 20),
('communication_tower_module', 15, 10, 10),
('solar_power_module', 15, 50, 30),
('living_module', 15, 5, 3),
('sport_module', 15, 15, 10),
('administrative_module', 15, 12, 8),
('medical_module', 15, 20, 10),
('research_module', 15, 25, 12),
('repair_module', 15, 30, 15),
('plantation_module', 15, 50, 30);

INSERT INTO module_distance_rules (id, module_type_1, module_type_2, min_distance, max_distance) VALUES
(1, 'living_module', 'repair_module', 100, 300),
(2, 'living_module', 'spaceport_module', 2000, NULL),
(3, 'living_module', 'communication_tower_module', 200, NULL),
(4, 'living_module', 'landfill_module', 2000, NULL),
(5, 'living_module', 'production_module', 2000, NULL),
(6, 'living_module', 'astro_site_module', 2000, NULL),
(7, 'living_module', 'solar_power_module', 300, NULL),
(8, 'living_module', 'mine_module', 1000, NULL),
(9, 'repair_module', 'repair_module', 50, 100),
(10, 'repair_module', 'communication_tower_module', 100, NULL),
(11, 'repair_module', 'plantation_module', 100, 200),
(12, 'repair_module', 'landfill_module', 500, NULL),
(13, 'repair_module', 'production_module', 100, 200),
(14, 'repair_module', 'astro_site_module', 500, NULL),
(15, 'repair_module', 'solar_power_module', 200, NULL),
(16, 'repair_module', 'mine_module', 300, NULL),
(17, 'spaceport_module', 'communication_tower_module', 500, NULL),
(18, 'spaceport_module', 'plantation_module', 500, NULL),
(19, 'spaceport_module', 'landfill_module', 1000, NULL),
(20, 'spaceport_module', 'production_module', 500, NULL),
(21, 'medical_module', 'plantation_module', 10, 200),
(22, 'medical_module', 'astro_site_module', 2000, NULL),
(23, 'medical_module', 'solar_power_module', 300, NULL),
(24, 'research_module', 'repair_module', 200, NULL),
(25, 'research_module', 'spaceport_module', 2000, NULL),
(26, 'research_module', 'communication_tower_module', 200, NULL),
(27, 'research_module', 'plantation_module', 20, 200),
(28, 'research_module', 'landfill_module', 2000, NULL),
(29, 'research_module', 'astro_site_module', 10, 200),
(30, 'research_module', 'solar_power_module', 300, NULL),
(31, 'living_module', 'plantation_module', 10, 200),
(32, 'repair_module', 'spaceport_module', 100, 200),
(33, 'spaceport_module', 'spaceport_module', 2000, NULL),
(34, 'living_module', 'sport_module', 10, 150),
(35, 'living_module', 'medical_module', 10, 100),
(36, 'living_module', 'research_module', 10, 150),
(37, 'administrative_module', 'medical_module', 10, 100),
(38, 'administrative_module', 'research_module', 10, 100),
(39, 'medical_module', 'spaceport_module', 2000, NULL),
(40, 'living_module', 'administrative_module', 10, 125),
(41, 'medical_module', 'production_module', 20, 500),
(42, 'sport_module', 'administrative_module', 50, 200),
(43, 'sport_module', 'medical_module', 50, 200),
(44, 'sport_module', 'research_module', 50, 200),
(45, 'sport_module', 'sport_module', 50, NULL),
(46, 'spaceport_module', 'astro_site_module', 2000, NULL),
(47, 'spaceport_module', 'solar_power_module', 500, NULL),
(48, 'spaceport_module', 'mine_module', 1000, NULL),
(49, 'communication_tower_module', 'communication_tower_module', 1000, 2000),
(50, 'communication_tower_module', 'plantation_module', 200, NULL),
(51, 'communication_tower_module', 'landfill_module', 500, NULL),
(52, 'communication_tower_module', 'production_module', 500, NULL),
(53, 'communication_tower_module', 'astro_site_module', 1000, NULL),
(54, 'communication_tower_module', 'solar_power_module', 300, NULL),
(55, 'communication_tower_module', 'mine_module', 500, NULL),
(56, 'plantation_module', 'plantation_module', 50, 100),
(57, 'plantation_module', 'landfill_module', 1000, NULL),
(58, 'plantation_module', 'production_module', 500, NULL),
(59, 'plantation_module', 'astro_site_module', 1000, NULL),
(60, 'plantation_module', 'solar_power_module', 200, NULL),
(61, 'plantation_module', 'mine_module', 500, NULL),
(62, 'landfill_module', 'landfill_module', 500, NULL),
(63, 'landfill_module', 'production_module', 1000, NULL),
(64, 'landfill_module', 'astro_site_module', 2000, NULL),
(65, 'landfill_module', 'solar_power_module', 1000, NULL),
(66, 'landfill_module', 'mine_module', 1000, NULL),
(67, 'production_module', 'production_module', 300, 500),
(68, 'production_module', 'astro_site_module', 2000, NULL),
(69, 'production_module', 'solar_power_module', 500, NULL),
(70, 'production_module', 'mine_module', 500, NULL),
(71, 'astro_site_module', 'mine_module', 1000, NULL),
(72, 'mine_module', 'mine_module', 500, 1000),
(73, 'living_module', 'living_module', 10, NULL),
(74, 'sport_module', 'repair_module', 200, NULL),
(75, 'sport_module', 'spaceport_module', 2000, NULL),
(76, 'sport_module', 'communication_tower_module', 200, NULL),
(77, 'sport_module', 'plantation_module', 10, 200),
(78, 'sport_module', 'landfill_module', 2000, NULL),
(79, 'sport_module', 'production_module', 2000, NULL),
(80, 'sport_module', 'astro_site_module', 2000, NULL),
(81, 'sport_module', 'solar_power_module', 300, NULL),
(82, 'sport_module', 'mine_module', 1000, NULL),
(83, 'administrative_module', 'repair_module', 200, NULL),
(84, 'administrative_module', 'spaceport_module', 2000, NULL),
(85, 'administrative_module', 'communication_tower_module', 200, NULL),
(86, 'administrative_module', 'plantation_module', 10, 200),
(87, 'administrative_module', 'landfill_module', 2000, NULL),
(88, 'administrative_module', 'production_module', 2000, NULL),
(89, 'administrative_module', 'astro_site_module', 2000, NULL),
(90, 'administrative_module', 'solar_power_module', 300, NULL),
(91, 'administrative_module', 'mine_module', 1000, NULL),
(92, 'medical_module', 'repair_module', 10, 200),
(93, 'medical_module', 'communication_tower_module', 200, NULL),
(94, 'astro_site_module', 'astro_site_module', 2000, NULL),
(95, 'astro_site_module', 'solar_power_module', 1000, NULL),
(96, 'solar_power_module', 'solar_power_module', 1000, 2000),
(97, 'solar_power_module', 'mine_module', 500, NULL),
(98, 'administrative_module', 'administrative_module', 10, NULL),
(99, 'medical_module', 'research_module', 50, 150),
(100, 'medical_module', 'medical_module', 20, NULL),
(101, 'research_module', 'production_module', 100, NULL),
(102, 'research_module', 'mine_module', 100, NULL),
(103, 'research_module', 'research_module', 20, NULL),
(104, 'medical_module', 'landfill_module', 100, NULL),
(105, 'medical_module', 'mine_module', 20, 500);