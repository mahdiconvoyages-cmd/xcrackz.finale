-- ============================================================================
-- Push notifications via Edge Function for all planning_notifications
-- This trigger calls send-notification Edge Function via pg_net
-- whenever a new planning_notification is inserted
-- ============================================================================

-- Create function that sends push notification via Edge Function
CREATE OR REPLACE FUNCTION send_push_on_planning_notification()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Call the send-notification edge function via pg_net
  PERFORM net.http_post(
    url := 'https://lqrulgkavtzummbsxsok.supabase.co/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxcnVsZ2thdnR6dW1tYnN4c29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDExNzk5MCwiZXhwIjoyMDc1NjkzOTkwfQ.CMP8vn2YIGokzPOfPdRqzp5HoiYlmF9lg7DTVXVXHfo'
    ),
    body := jsonb_build_object(
      'userId', NEW.user_id,
      'type', NEW.type,
      'title', NEW.title,
      'message', NEW.body,
      'data', COALESCE(NEW.data, '{}'::jsonb)
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger on planning_notifications
DROP TRIGGER IF EXISTS trg_push_on_planning_notification ON planning_notifications;
CREATE TRIGGER trg_push_on_planning_notification
  AFTER INSERT ON planning_notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_on_planning_notification();
