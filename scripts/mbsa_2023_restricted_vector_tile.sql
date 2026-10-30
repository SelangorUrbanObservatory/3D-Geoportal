-- SUO restricted MBSA cadastre MVT provider.
-- Use only AFTER authorized import of MBSA_2023_P3_RESTRICTED.gpkg
-- to suo_cadastre.mbsa_parcels_2023 with valid EPSG:4326 geom and GiST.
--
-- This creates one shared source for main GeoPortal/Compare/P3 visualizing
-- WITHOUT exposing UPI, owner names, title numbers, or owner addresses
-- as MVT attributes. Keep pg_tileserv/function behind a protected gateway.
--
-- SELECT: source-layer = mbsa_parcels_2023 (explicit ST_AsMVT name).
-- Endpoint example after private deployment:
--   /tiles/suo_tiles.mbsa_parcels_2023/{z}/{x}/{y}.pbf
-- Route/path is an EXAMPLE, not a live URL. Verify actual pg_tileserv URL.

CREATE SCHEMA IF NOT EXISTS suo_tiles;

CREATE OR REPLACE FUNCTION suo_tiles.mbsa_parcels_2023(
    z integer, x integer, y integer
) RETURNS bytea
AS $$
DECLARE
  tile_bounds geometry;
  padded_search geometry;
BEGIN
  IF z < 12 OR z > 22 THEN
    RETURN ''::bytea;
  END IF;
  tile_bounds := ST_TileEnvelope(z, x, y);
  padded_search := ST_Transform(
    ST_TileEnvelope(z, x, y, margin => 256.0 / 4096), 4326
  );

  RETURN COALESCE((
    WITH visible AS (
      SELECT
        p.parcel_feature_id::bigint AS parcel_feature_id,
        -- Only minimal approved labels and neutral metadata:
        NULLIF(TRIM(p.lot_number), '') AS lot_number,
        p.district_code,
        p.mukim_code,
        p.section_code,
        ROUND(p.area_geom_m2::numeric, 2)::double precision AS area_geom_m2,
        p.source_year,
        ST_AsMVTGeom(
          ST_Transform(p.geom, 3857), tile_bounds,
          4096, 256, true
        ) AS geom
      FROM suo_cadastre.mbsa_parcels_2023 p
      WHERE p.geom && padded_search
        AND ST_Intersects(p.geom, padded_search)
    )
    SELECT ST_AsMVT(visible, 'mbsa_parcels_2023', 4096,
                    'geom', 'parcel_feature_id')
    FROM visible
    WHERE geom IS NOT NULL
  ), ''::bytea);
END;
$ LANGUAGE plpgsql STABLE PARALLEL SAFE
SECURITY DEFINER SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION suo_tiles.mbsa_parcels_2023(integer,integer,integer)
  FROM PUBLIC;

-- Explicit GRANT EXECUTE belongs in the secure DB deploy process after
-- the approved tile service role is provisioned. No grants to anon users.
-- GRANT EXECUTE ON FUNCTION suo_tiles.mbsa_parcels_2023(integer,integer,integer)
--   TO approved_suo_tile_service_role;

COMMENT ON FUNCTION suo_tiles.mbsa_parcels_2023(integer,integer,integer)
  IS 'MBSA 2023 minimal authorized parcel MVT. No owner or UPI in tile output.';

-- Security notes:
-- * pg_tileserv database role must only have EXECUTE permission for the
--   function; review privileges on source table / function owner.
-- * Do not grant PUBLIC access to this MVT in the production API.
-- * Put pg_tileserv behind HTTPS and authenticated reverse proxy with
--   an explicit allowlist of SUO users/origins. Endpoint must return
--   401/403 for unauthorized visitors.
-- * No direct PostgreSQL credentials or private tokens in browser config.
-- * Avoid exposing pg_tileserv preview/layer listing to unauthenticated users.
-- * Validate tiles with an approved account before setting
--   config/cadastral-layer.json -> enabled=true, tiles=[...].
