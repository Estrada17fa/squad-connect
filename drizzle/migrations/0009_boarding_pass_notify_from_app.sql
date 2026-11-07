-- Los avisos "Tu pase de abordar está listo" se envían desde la app (función de servidor),
-- una vez por persona y nunca en Borrador. El trigger queda, pero ya no avisa.
CREATE OR REPLACE FUNCTION public.notify_boarding_pass()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.notify_boarding_pass() IS 'DEPRECATED: no-op; boarding pass notices are sent by the notifyBoardingPasses server function.';