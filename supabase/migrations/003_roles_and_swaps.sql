-- Migration 003: Role system, invites, and shift swaps
-- Admins own boards; Workers join via invite links and are linked to a Person in the board.

-- ─── board_members ────────────────────────────────────────────────────────────
-- Links a Supabase user to an Admin's board with a specific person_id.
CREATE TABLE IF NOT EXISTS public.board_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id  text NOT NULL,  -- matches Person.id inside the board's AppState JSON
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board_id, user_id)
);

ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

-- Board owner can see all members of their boards
CREATE POLICY "board_members: owner can read"
  ON public.board_members FOR SELECT
  USING (
    board_id IN (SELECT id FROM public.boards WHERE user_id = auth.uid())
  );

-- Workers can read their own membership records
CREATE POLICY "board_members: worker can read own"
  ON public.board_members FOR SELECT
  USING (user_id = auth.uid());

-- Only the service role (used from Edge Functions / RPC) can insert/delete
-- Workers are added via the accept_invite RPC defined below.
CREATE POLICY "board_members: owner can delete"
  ON public.board_members FOR DELETE
  USING (
    board_id IN (SELECT id FROM public.boards WHERE user_id = auth.uid())
  );

-- ─── invites ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  token      uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Board owners can manage their own invites
CREATE POLICY "invites: owner can all"
  ON public.invites FOR ALL
  USING (
    board_id IN (SELECT id FROM public.boards WHERE user_id = auth.uid())
  )
  WITH CHECK (
    board_id IN (SELECT id FROM public.boards WHERE user_id = auth.uid())
  );

-- Any authenticated user can read an invite by token (needed to accept it)
CREATE POLICY "invites: any auth user can read"
  ON public.invites FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─── shift_swaps ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shift_swaps (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id            uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  schedule_id         text NOT NULL,
  shift_id            text NOT NULL,
  date                text NOT NULL,   -- ISO date string, e.g. "2026-03-26"
  position_id         text NOT NULL,
  requester_person_id text NOT NULL,
  target_person_id    text NOT NULL,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_swaps ENABLE ROW LEVEL SECURITY;

-- Workers (board_members) and the board owner can read swaps for their board
CREATE POLICY "shift_swaps: board participants can read"
  ON public.shift_swaps FOR SELECT
  USING (
    board_id IN (SELECT id FROM public.boards WHERE user_id = auth.uid())
    OR
    board_id IN (SELECT board_id FROM public.board_members WHERE user_id = auth.uid())
  );

-- Workers can create swaps for boards they belong to
CREATE POLICY "shift_swaps: worker can insert"
  ON public.shift_swaps FOR INSERT
  WITH CHECK (
    board_id IN (SELECT board_id FROM public.board_members WHERE user_id = auth.uid())
  );

-- Target worker can accept/reject; owner can also update
CREATE POLICY "shift_swaps: participant can update"
  ON public.shift_swaps FOR UPDATE
  USING (
    board_id IN (SELECT id FROM public.boards WHERE user_id = auth.uid())
    OR
    board_id IN (SELECT board_id FROM public.board_members WHERE user_id = auth.uid())
  );

-- ─── RPC: update_worker_constraints ──────────────────────────────────────────
-- Allows a worker to atomically update only their own person's `constraints`
-- and `unavailability` fields inside the board's board_data JSONB blob,
-- without touching any other part of the state (no race condition risk).
CREATE OR REPLACE FUNCTION public.update_worker_constraints(
  p_board_id      uuid,
  p_person_id     text,
  p_constraints   jsonb,
  p_unavailability jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person_index int;
BEGIN
  -- Verify the calling user is a member of this board with that person_id
  IF NOT EXISTS (
    SELECT 1 FROM public.board_members
    WHERE board_id = p_board_id
      AND user_id  = auth.uid()
      AND person_id = p_person_id
  ) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  -- Find the index of the person inside the people array
  SELECT pos - 1 INTO v_person_index
  FROM public.boards b,
       jsonb_array_elements(b.board_data->'people') WITH ORDINALITY AS arr(elem, pos)
  WHERE b.id = p_board_id
    AND arr.elem->>'id' = p_person_id;

  IF v_person_index IS NULL THEN
    RAISE EXCEPTION 'Person not found in board data';
  END IF;

  -- Atomically patch only the constraints/unavailability for that person
  UPDATE public.boards
  SET
    board_data = jsonb_set(
      jsonb_set(
        board_data,
        ARRAY['people', v_person_index::text, 'constraints'],
        p_constraints
      ),
      ARRAY['people', v_person_index::text, 'unavailability'],
      p_unavailability
    ),
    updated_at = now()
  WHERE id = p_board_id;
END;
$$;

-- ─── RPC: accept_invite ───────────────────────────────────────────────────────
-- Looks up an invite token, creates a new Person in the board's AppState,
-- and inserts a board_members row linking the current user to that person.
CREATE OR REPLACE FUNCTION public.accept_invite(
  p_token     uuid,
  p_name      text,
  p_color_hex text DEFAULT '#94a3b8'
)
RETURNS jsonb   -- returns { board_id, person_id, board_owner_email }
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite     public.invites%ROWTYPE;
  v_board      public.boards%ROWTYPE;
  v_person_id  text := gen_random_uuid()::text;
  v_new_person jsonb;
  v_owner_email text;
BEGIN
  -- Fetch invite
  SELECT * INTO v_invite FROM public.invites WHERE token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite token';
  END IF;

  -- Fetch board
  SELECT * INTO v_board FROM public.boards WHERE id = v_invite.board_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Board not found';
  END IF;

  -- Check the caller is not already a member
  IF EXISTS (
    SELECT 1 FROM public.board_members
    WHERE board_id = v_invite.board_id AND user_id = auth.uid()
  ) THEN
    -- Already a member — just return existing info
    SELECT bm.person_id INTO v_person_id
    FROM public.board_members bm
    WHERE bm.board_id = v_invite.board_id AND bm.user_id = auth.uid();

    RETURN jsonb_build_object(
      'board_id',  v_invite.board_id,
      'person_id', v_person_id
    );
  END IF;

  -- Build a minimal Person object (AppState schema)
  v_new_person := jsonb_build_object(
    'id',                 v_person_id,
    'name',               p_name,
    'colorHex',           p_color_hex,
    'homeGroupIds',       '[]'::jsonb,
    'qualifiedPositions', '[]'::jsonb,
    'unavailability',     '[]'::jsonb,
    'constraints',        'null'::jsonb
  );

  -- Append the new person to the people array in board_data
  UPDATE public.boards
  SET
    board_data = jsonb_set(
      board_data,
      '{people}',
      (board_data->'people') || v_new_person
    ),
    updated_at = now()
  WHERE id = v_invite.board_id;

  -- Insert board_members row
  INSERT INTO public.board_members (board_id, user_id, person_id)
  VALUES (v_invite.board_id, auth.uid(), v_person_id);

  RETURN jsonb_build_object(
    'board_id',  v_invite.board_id,
    'person_id', v_person_id
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_worker_constraints TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite TO authenticated;

-- Workers need read access to boards they are members of
-- (existing boards RLS only allows owner; extend it with a new policy)
CREATE POLICY "boards: worker member can read"
  ON public.boards FOR SELECT
  USING (
    id IN (SELECT board_id FROM public.board_members WHERE user_id = auth.uid())
  );
