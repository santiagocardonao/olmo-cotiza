import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

// Current session, plus whether the user is an Olmo member.
export function useSession() {
  const [state, setState] = useState({ loading: true, session: null, isMember: false });

  useEffect(() => {
    let alive = true;
    let latest = 0;
    async function load(session) {
      // Several loads can overlap (initial session, sign-in, sign-out);
      // only the most recent one may set the state.
      const run = ++latest;
      let isMember = false;
      if (session) {
        // A network error must not read as "not a member": retry before deciding.
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data, error } = await supabase.from("memberships").select("org_id").limit(1);
          if (!error) { isMember = (data ?? []).length > 0; break; }
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }
      if (alive && run === latest) setState({ loading: false, session, isMember });
    }
    // onAuthStateChange also emits INITIAL_SESSION, so no separate getSession().
    // The callback must not await Supabase calls (it runs inside the auth lock),
    // so the membership query is deferred.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setTimeout(() => load(session), 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  return state;
}
