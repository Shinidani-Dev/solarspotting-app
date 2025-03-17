-- PostgreSQL-Schema für die SolarSpotting-App

-- Tabelle für Benutzer
CREATE TABLE IF NOT EXISTS s_user (
    id SERIAL PRIMARY KEY,
    tstamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    firstname VARCHAR(255) NOT NULL,
    lastname VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    company VARCHAR(255),
    street VARCHAR(255) NOT NULL,
    postal_code VARCHAR(32) NOT NULL,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(64) NOT NULL,
    country VARCHAR(2) NOT NULL,  -- 2-letter ISO Code for country
    phone VARCHAR(32),
    mobile VARCHAR(32),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(64) NOT NULL UNIQUE,
    hashed_pw VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    login_attempts INTEGER DEFAULT 0,
    locked BOOLEAN DEFAULT FALSE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'admin')) DEFAULT 'user',
    is_labeler BOOLEAN DEFAULT FALSE
);

-- Tabelle für Beobachter (erweitert einen Benutzer)
CREATE TABLE IF NOT EXISTS s_observer (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    is_ai BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES s_user (id)
        ON DELETE CASCADE
);

-- Tabelle für Instrumente
CREATE TABLE IF NOT EXISTS s_instrument (
    id SERIAL PRIMARY KEY,
    tstamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    i_id VARCHAR(255) NOT NULL,
    i_type TEXT NOT NULL,
    i_aperture INTEGER,
    i_focal_length INTEGER,
    i_filter TEXT,
    i_method TEXT,
    i_magnification INTEGER,
    i_projection INTEGER,
    i_inputpref INTEGER,
    in_use BOOLEAN DEFAULT TRUE,
    observer_id INTEGER NOT NULL,
    CONSTRAINT fk_observer
        FOREIGN KEY (observer_id)
        REFERENCES s_observer (id)
        ON DELETE CASCADE
);

-- Tabelle für Beobachtungen
CREATE TABLE IF NOT EXISTS s_observation (
    id SERIAL PRIMARY KEY,
    tstamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    daily_protocol VARCHAR(255),  -- Link to the saved daily_protocol (pdf)
    sdo_image VARCHAR(255),       -- Link to the saved sdo-image (jpg)
    verified BOOLEAN DEFAULT FALSE,
    observer_id INTEGER NOT NULL,
    instrument_id INTEGER NOT NULL,
    CONSTRAINT fk_observer
        FOREIGN KEY (observer_id)
        REFERENCES s_observer (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_instrument
        FOREIGN KEY (instrument_id)
        REFERENCES s_instrument (id)
        ON DELETE RESTRICT
);

-- Tabelle für Beobachtungstage
CREATE TABLE IF NOT EXISTS s_day_data (
    id SERIAL PRIMARY KEY,
    tstamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    d_code INTEGER NOT NULL,
    d_date DATE NOT NULL,
    d_ut INTEGER,
    d_q INTEGER,
    d_gruppen INTEGER,
    d_flecken INTEGER,
    d_a INTEGER,
    d_b INTEGER,
    d_c INTEGER,
    d_d INTEGER,
    d_e INTEGER,
    d_f INTEGER,
    d_g INTEGER,
    d_h INTEGER,
    d_j INTEGER,
    observation_id INTEGER NOT NULL UNIQUE,
    CONSTRAINT fk_observation
        FOREIGN KEY (observation_id)
        REFERENCES s_observation (id)
        ON DELETE CASCADE
);

-- Tabelle für Sonnencluster (Gruppen)
CREATE TABLE IF NOT EXISTS s_group_data (
    id SERIAL PRIMARY KEY,
    tstamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    g_code INTEGER NOT NULL,
    g_date DATE NOT NULL,
    g_ut INTEGER,
    g_q INTEGER,
    g_nr INTEGER,
    g_f INTEGER,
    g_zpd VARCHAR(3),
    g_p INTEGER,
    g_s INTEGER,
    g_sector INTEGER,
    g_a INTEGER,
    g_pos VARCHAR(6),
    day_data_id INTEGER NOT NULL,
    observation_id INTEGER NOT NULL,
    rect_x_min INTEGER NOT NULL,
    rect_y_min INTEGER NOT NULL,
    rect_x_max INTEGER NOT NULL,
    rect_y_max INTEGER NOT NULL,
    CONSTRAINT fk_day_data
        FOREIGN KEY (day_data_id)
        REFERENCES s_day_data (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_observation
        FOREIGN KEY (observation_id)
        REFERENCES s_observation (id)
        ON DELETE CASCADE
);

-- Indizes für Performance-Optimierung
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE c.relname = 'idx_s_user_username' AND n.nspname = current_schema()) THEN
        CREATE INDEX idx_s_user_username ON s_user(username);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE c.relname = 'idx_s_user_email' AND n.nspname = current_schema()) THEN
        CREATE INDEX idx_s_user_email ON s_user(email);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE c.relname = 'idx_s_observer_user_id' AND n.nspname = current_schema()) THEN
        CREATE INDEX idx_s_observer_user_id ON s_observer(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE c.relname = 'idx_s_instrument_observer_id' AND n.nspname = current_schema()) THEN
        CREATE INDEX idx_s_instrument_observer_id ON s_instrument(observer_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE c.relname = 'idx_s_observation_observer_id' AND n.nspname = current_schema()) THEN
        CREATE INDEX idx_s_observation_observer_id ON s_observation(observer_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE c.relname = 'idx_s_observation_instrument_id' AND n.nspname = current_schema()) THEN
        CREATE INDEX idx_s_observation_instrument_id ON s_observation(instrument_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE c.relname = 'idx_s_day_data_observation_id' AND n.nspname = current_schema()) THEN
        CREATE INDEX idx_s_day_data_observation_id ON s_day_data(observation_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE c.relname = 'idx_s_group_data_day_data_id' AND n.nspname = current_schema()) THEN
        CREATE INDEX idx_s_group_data_day_data_id ON s_group_data(day_data_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE c.relname = 'idx_s_group_data_observation_id' AND n.nspname = current_schema()) THEN
        CREATE INDEX idx_s_group_data_observation_id ON s_group_data(observation_id);
    END IF;
END$$;

-- Kommentare zu Spalten hinzufügen (nur wenn Tabellen existieren)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 's_user') THEN
        COMMENT ON COLUMN s_user.country IS '2-letter ISO Code for country';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 's_observation') THEN
        COMMENT ON COLUMN s_observation.daily_protocol IS 'Link to the saved daily protocol PDF file';
        COMMENT ON COLUMN s_observation.sdo_image IS 'Link to the saved SDO image file';
    END IF;
END$$;