UPDATE public.role_permissions
SET access_level = CASE
  WHEN level = 'sin_acceso' THEN 'none'::access_level
  WHEN level IN ('vista_jugador','lector_categoria','lector_global') THEN 'read'::access_level
  ELSE 'editor'::access_level
END
WHERE access_level IS DISTINCT FROM (CASE
  WHEN level = 'sin_acceso' THEN 'none'::access_level
  WHEN level IN ('vista_jugador','lector_categoria','lector_global') THEN 'read'::access_level
  ELSE 'editor'::access_level
END);

UPDATE public.user_permission_overrides
SET access_level = CASE
  WHEN level = 'sin_acceso' THEN 'none'::access_level
  WHEN level IN ('vista_jugador','lector_categoria','lector_global') THEN 'read'::access_level
  ELSE 'editor'::access_level
END
WHERE access_level IS DISTINCT FROM (CASE
  WHEN level = 'sin_acceso' THEN 'none'::access_level
  WHEN level IN ('vista_jugador','lector_categoria','lector_global') THEN 'read'::access_level
  ELSE 'editor'::access_level
END);