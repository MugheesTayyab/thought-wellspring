BEGIN;

ALTER TABLE public.device_actions
  DROP CONSTRAINT IF EXISTS device_actions_action_type_check;

ALTER TABLE public.device_actions
  ADD CONSTRAINT device_actions_action_type_check
  CHECK (action_type IN (
    'submit_post', 'echo', 'react', 'report', 'duel_vote', 'auth', 'push_subscription'
  ));

COMMIT;
