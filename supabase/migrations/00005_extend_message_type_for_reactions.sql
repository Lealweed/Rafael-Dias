DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'message_type'
  ) THEN
    BEGIN
      ALTER TYPE public.message_type ADD VALUE IF NOT EXISTS 'reaction';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER TYPE public.message_type ADD VALUE IF NOT EXISTS 'video';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
