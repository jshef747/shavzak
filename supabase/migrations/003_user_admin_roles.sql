-- ============================================================
-- 003_user_admin_roles.sql
-- Adds profiles, invites, board_members, swap_requests tables
-- plus RPCs: join_board, apply_swap, update_person_preferences
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Profiles (role + email lookup)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'user')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on signup; ALL normal signups default to 'admin' (solo mode)
-- Only join_board RPC downgrades a user to 'user' role (invite flow)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles(id, email, role)
  VALUES (NEW.id, NEW.email, 'admin')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 2. Invites: general board invite links (multi-use until revoked)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "board owner manages invites" ON public.invites;
CREATE POLICY "board owner manages invites" ON public.invites FOR ALL USING (
  EXISTS (SELECT 1 FROM public.boards WHERE id = invites.board_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "anyone reads invite by id" ON public.invites;
CREATE POLICY "anyone reads invite by id" ON public.invites FOR SELECT USING (true);

-- ────────────────────────────────────────────────────────────
-- 3. Board members: links a user account to a Person in a board
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(board_id, user_id)
);

ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "board owner manages members" ON public.board_members;
CREATE POLICY "board owner manages members" ON public.board_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.boards WHERE id = board_members.board_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "member reads own" ON public.board_members;
CREATE POLICY "member reads own" ON public.board_members FOR SELECT USING (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 4. Swap requests
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  requester_person_id text NOT NULL,
  requester_date text NOT NULL,
  requester_shift_id text NOT NULL,
  requester_position_id text NOT NULL,
  target_person_id text NOT NULL,
  target_date text,
  target_shift_id text,
  target_position_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants read swap requests" ON public.swap_requests;
CREATE POLICY "participants read swap requests" ON public.swap_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.boards WHERE id = swap_requests.board_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.board_members WHERE board_id = swap_requests.board_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "member inserts swap request" ON public.swap_requests;
CREATE POLICY "member inserts swap request" ON public.swap_requests FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.board_members
    WHERE board_id = swap_requests.board_id
      AND user_id = auth.uid()
      AND person_id = swap_requests.requester_person_id
  )
);

DROP POLICY IF EXISTS "participant updates swap request" ON public.swap_requests;
CREATE POLICY "participant updates swap request" ON public.swap_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.board_members WHERE board_id = swap_requests.board_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.boards WHERE id = swap_requests.board_id AND user_id = auth.uid())
);

-- ────────────────────────────────────────────────────────────
-- 5. RLS: profiles
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own profile rw" ON public.profiles;
CREATE POLICY "own profile rw" ON public.profiles FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "admin reads all profiles" ON public.profiles;
CREATE POLICY "admin reads all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Allow board members to read each other's profiles (for UsersTab email lookup)
DROP POLICY IF EXISTS "board member reads profiles" ON public.profiles;
CREATE POLICY "board member reads profiles" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.board_members bm1
    JOIN public.board_members bm2 ON bm1.board_id = bm2.board_id
    WHERE bm1.user_id = auth.uid() AND bm2.user_id = profiles.id
  )
);

-- ────────────────────────────────────────────────────────────
-- 6. RLS: boards — allow members to read the admin's board
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "member read" ON public.boards;
CREATE POLICY "member read" ON public.boards FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.board_members WHERE board_id = boards.id AND user_id = auth.uid())
);

-- ────────────────────────────────────────────────────────────
-- 7. RPC: join_board
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_board(
  invite_token uuid,
  person_name text,
  position_id text
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  inv public.invites%rowtype;
  new_person_id text;
BEGIN
  SELECT * INTO inv FROM public.invites
  WHERE id = invite_token AND revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invite not found or revoked'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.board_members
    WHERE board_id = inv.board_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Already a member of this board';
  END IF;

  new_person_id := gen_random_uuid()::text;

  UPDATE public.boards
  SET board_data = jsonb_set(
    board_data, '{people}',
    COALESCE(board_data->'people', '[]'::jsonb) || jsonb_build_object(
      'id', new_person_id,
      'name', person_name,
      'colorHex', '#94a3b8',
      'homeGroupIds', '[]'::jsonb,
      'qualifiedPositions', jsonb_build_array(position_id),
      'unavailability', '[]'::jsonb,
      'constraints', null
    )
  ),
  updated_at = now()
  WHERE id = inv.board_id;

  INSERT INTO public.board_members(board_id, user_id, person_id)
  VALUES (inv.board_id, auth.uid(), new_person_id);

  UPDATE public.profiles SET role = 'user' WHERE id = auth.uid();

  RETURN new_person_id;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 8. RPC: apply_swap
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_swap(swap_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  req public.swap_requests%rowtype;
  caller_person_id text;
BEGIN
  SELECT * INTO req FROM public.swap_requests
  WHERE id = swap_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Swap not found or not pending'; END IF;

  SELECT person_id INTO caller_person_id FROM public.board_members
  WHERE board_id = req.board_id AND user_id = auth.uid();
  IF caller_person_id IS DISTINCT FROM req.target_person_id THEN
    RAISE EXCEPTION 'Not authorized to approve this swap';
  END IF;

  UPDATE public.boards
  SET board_data = jsonb_set(
    board_data,
    '{schedules}',
    (
      SELECT jsonb_agg(
        CASE WHEN s->>'id' = board_data->>'activeScheduleId'
        THEN jsonb_set(s, '{assignments}', (
          SELECT jsonb_agg(
            CASE
              WHEN a->>'personId' = req.requester_person_id
                AND a->>'date' = req.requester_date
                AND a->>'shiftId' = req.requester_shift_id
                AND a->>'positionId' = req.requester_position_id
              THEN jsonb_set(a, '{personId}', to_jsonb(req.target_person_id))
              WHEN a->>'personId' = req.target_person_id
                AND a->>'date' = req.target_date
                AND a->>'shiftId' = req.target_shift_id
                AND a->>'positionId' = req.target_position_id
              THEN jsonb_set(a, '{personId}', to_jsonb(req.requester_person_id))
              ELSE a
            END
          ) FROM jsonb_array_elements(s->'assignments') a
        ))
        ELSE s END
      ) FROM jsonb_array_elements(board_data->'schedules') s
    )
  ),
  updated_at = now()
  WHERE id = req.board_id;

  UPDATE public.swap_requests SET status = 'approved' WHERE id = swap_request_id;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 9. RPC: update_person_preferences
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_person_preferences(
  p_board_id uuid,
  p_person_id text,
  p_constraints jsonb,
  p_unavailability jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.board_members
    WHERE board_id = p_board_id AND user_id = auth.uid() AND person_id = p_person_id
  ) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  UPDATE public.boards
  SET board_data = jsonb_set(
    board_data, '{people}',
    (
      SELECT jsonb_agg(
        CASE WHEN p->>'id' = p_person_id
          THEN p || jsonb_build_object(
            'constraints', p_constraints,
            'unavailability', p_unavailability
          )
          ELSE p END
      ) FROM jsonb_array_elements(board_data->'people') p
    )
  ),
  updated_at = now()
  WHERE id = p_board_id;
END;
$$;
