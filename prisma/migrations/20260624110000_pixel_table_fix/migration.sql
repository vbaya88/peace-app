-- Migration: pixel_table_fix
-- This migration:
-- 1. Creates Pixel table (if not exists) — works around stuck 20260624100000
-- 2. Seeds city grid pixels

CREATE TYPE IF NOT EXISTS "PixelStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'CLAIMED');
CREATE TYPE IF NOT EXISTS "PriceTier" AS ENUM ('BASIC', 'PREMIUM', 'STAR', 'SPECIAL');

CREATE TABLE IF NOT EXISTS "Pixel" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "gridLat" DOUBLE PRECISION NOT NULL,
    "gridLng" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "PixelStatus" NOT NULL DEFAULT 'AVAILABLE',
    "name" TEXT,
    "color" TEXT NOT NULL DEFAULT '#818cf8',
    "message" TEXT,
    "countryCode" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "priceTier" "PriceTier" NOT NULL DEFAULT 'BASIC',
    "paymentId" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pixel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Pixel_gridLat_gridLng_key" ON "Pixel"("gridLat", "gridLng");
CREATE INDEX IF NOT EXISTS "Pixel_status_countryCode_idx" ON "Pixel"("status", "countryCode");
CREATE INDEX IF NOT EXISTS "Pixel_countryCode_idx" ON "Pixel"("countryCode");

DO $$
DECLARE
    c_name TEXT;
    c_cc TEXT;
    c_region TEXT;
    c_lat FLOAT;
    c_lng FLOAT;
    c_size INT;
    lat_off INT;
    lng_off INT;
    p_lat FLOAT;
    p_lng FLOAT;
    pixel_id TEXT;
BEGIN
    FOR c_name, c_cc, c_region, c_lat, c_lng, c_size IN VALUES
        ('New York','US','NY',40.7128,-74.0060,7),
        ('Los Angeles','US','CA',34.0522,-118.2437,5),
        ('Chicago','US','IL',41.8781,-87.6298,5),
        ('Houston','US','TX',29.7604,-95.3698,5),
        ('Miami','US','FL',25.7617,-80.1918,5),
        ('San Francisco','US','CA',37.7749,-122.4194,5),
        ('Seattle','US','WA',47.6062,-122.3321,4),
        ('Denver','US','CO',39.7392,-104.9903,4),
        ('Boston','US','MA',42.3601,-71.0589,4)
    LOOP
        FOR lat_off IN 0..c_size-1 LOOP
            FOR lng_off IN 0..c_size-1 LOOP
                IF (lat_off=0 OR lat_off=c_size-1) AND (lng_off=0 OR lng_off=c_size-1) AND random()>0.5 THEN CONTINUE; END IF;
                p_lat := ROUND((c_lat + (lat_off - c_size/2.0) * 0.09)::NUMERIC,6)::FLOAT;
                p_lng := ROUND((c_lng + (lng_off - c_size/2.0) * 0.13)::NUMERIC,6)::FLOAT;
                pixel_id := 'pixel_' || c_cc || '_' || REPLACE(c_name,' ','_') || '_' || lat_off || '_' || lng_off;
                INSERT INTO "Pixel" ("id","gridLat","gridLng","latitude","longitude","status","countryCode","city","region","priceTier")
                VALUES (pixel_id,p_lat,p_lng,p_lat,p_lng,'AVAILABLE',c_cc,c_name,c_region,'BASIC')
                ON CONFLICT ("gridLat","gridLng") DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;

    FOR c_name, c_cc, c_region, c_lat, c_lng, c_size IN VALUES
        ('London','GB','England',51.5074,-0.1278,7),
        ('Paris','FR','Île-de-France',48.8566,2.3522,5),
        ('Berlin','DE','Berlin',52.5200,13.4050,5),
        ('Madrid','ES','Madrid',40.4168,-3.7038,5),
        ('Rome','IT','Lazio',41.9028,12.4964,5),
        ('Amsterdam','NL','NH',52.3676,4.9041,4),
        ('Vienna','AT','Vienna',48.2082,16.3738,4),
        ('Prague','CZ','Prague',50.0755,14.4378,4),
        ('Warsaw','PL','Mazowieckie',52.2297,21.0122,4),
        ('Moscow','RU','Moscow',55.7558,37.6173,7),
        ('St Petersburg','RU','Leningrad',59.9311,30.3609,5)
    LOOP
        FOR lat_off IN 0..c_size-1 LOOP
            FOR lng_off IN 0..c_size-1 LOOP
                IF (lat_off=0 OR lat_off=c_size-1) AND (lng_off=0 OR lng_off=c_size-1) AND random()>0.5 THEN CONTINUE; END IF;
                p_lat := ROUND((c_lat + (lat_off - c_size/2.0) * 0.09)::NUMERIC,6)::FLOAT;
                p_lng := ROUND((c_lng + (lng_off - c_size/2.0) * 0.13)::NUMERIC,6)::FLOAT;
                pixel_id := 'pixel_' || c_cc || '_' || REPLACE(c_name,' ','_') || '_' || lat_off || '_' || lng_off;
                INSERT INTO "Pixel" ("id","gridLat","gridLng","latitude","longitude","status","countryCode","city","region","priceTier")
                VALUES (pixel_id,p_lat,p_lng,p_lat,p_lng,'AVAILABLE',c_cc,c_name,c_region,'BASIC')
                ON CONFLICT ("gridLat","gridLng") DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;

    FOR c_name, c_cc, c_region, c_lat, c_lng, c_size IN VALUES
        ('Istanbul','TR','Istanbul',41.0082,28.9784,5),
        ('Ankara','TR','Ankara',39.9334,32.8597,4),
        ('Tokyo','JP','Tokyo',35.6762,139.6503,7),
        ('Osaka','JP','Osaka',34.6937,135.5023,5),
        ('Seoul','KR','Seoul',37.5665,126.9780,5),
        ('Beijing','CN','Beijing',39.9042,116.4074,5),
        ('Shanghai','CN','Shanghai',31.2304,121.4737,5),
        ('Hong Kong','HK','HK',22.3193,114.1694,4),
        ('Singapore','SG','Singapore',1.3521,103.8198,4),
        ('Mumbai','IN','Maharashtra',19.0760,72.8777,5),
        ('Delhi','IN','Delhi',28.7041,77.1025,5),
        ('Bangalore','IN','Karnataka',12.9716,77.5946,4),
        ('Dubai','AE','Dubai',25.2048,55.2708,4)
    LOOP
        FOR lat_off IN 0..c_size-1 LOOP
            FOR lng_off IN 0..c_size-1 LOOP
                IF (lat_off=0 OR lat_off=c_size-1) AND (lng_off=0 OR lng_off=c_size-1) AND random()>0.5 THEN CONTINUE; END IF;
                p_lat := ROUND((c_lat + (lat_off - c_size/2.0) * 0.09)::NUMERIC,6)::FLOAT;
                p_lng := ROUND((c_lng + (lng_off - c_size/2.0) * 0.13)::NUMERIC,6)::FLOAT;
                pixel_id := 'pixel_' || c_cc || '_' || REPLACE(c_name,' ','_') || '_' || lat_off || '_' || lng_off;
                INSERT INTO "Pixel" ("id","gridLat","gridLng","latitude","longitude","status","countryCode","city","region","priceTier")
                VALUES (pixel_id,p_lat,p_lng,p_lat,p_lng,'AVAILABLE',c_cc,c_name,c_region,'BASIC')
                ON CONFLICT ("gridLat","gridLng") DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;

    FOR c_name, c_cc, c_region, c_lat, c_lng, c_size IN VALUES
        ('Sydney','AU','NSW',-33.8688,151.2093,5),
        ('Melbourne','AU','VIC',-37.8136,144.9631,5),
        ('São Paulo','BR','SP',-23.5505,-46.6333,5),
        ('Rio de Janeiro','BR','RJ',-22.9068,-43.1729,5),
        ('Buenos Aires','AR','BA',-34.6037,-58.3816,5),
        ('Mexico City','MX','CDMX',19.4326,-99.1332,5),
        ('Toronto','CA','ON',43.6532,-79.3832,5),
        ('Vancouver','CA','BC',49.2827,-123.1207,4),
        ('Cairo','EG','Cairo',30.0444,31.2357,4),
        ('Lagos','NG','Lagos',6.5244,3.3792,4),
        ('Nairobi','KE','Nairobi',-1.2921,36.8219,4),
        ('Johannesburg','ZA','Gauteng',-26.2041,28.0473,4),
        ('Cape Town','ZA','WC',-33.9249,18.4241,4)
    LOOP
        FOR lat_off IN 0..c_size-1 LOOP
            FOR lng_off IN 0..c_size-1 LOOP
                IF (lat_off=0 OR lat_off=c_size-1) AND (lng_off=0 OR lng_off=c_size-1) AND random()>0.5 THEN CONTINUE; END IF;
                p_lat := ROUND((c_lat + (lat_off - c_size/2.0) * 0.09)::NUMERIC,6)::FLOAT;
                p_lng := ROUND((c_lng + (lng_off - c_size/2.0) * 0.13)::NUMERIC,6)::FLOAT;
                pixel_id := 'pixel_' || c_cc || '_' || REPLACE(c_name,' ','_') || '_' || lat_off || '_' || lng_off;
                INSERT INTO "Pixel" ("id","gridLat","gridLng","latitude","longitude","status","countryCode","city","region","priceTier")
                VALUES (pixel_id,p_lat,p_lng,p_lat,p_lng,'AVAILABLE',c_cc,c_name,c_region,'BASIC')
                ON CONFLICT ("gridLat","gridLng") DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
