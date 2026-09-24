import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";

// Current session, plus whether the user is an Olmo member.
export function useSession() {
  const [state, setState] = useState({ loading: true, session: null, isMember: false });

  useEffect(() => {
    let alive = true;
    async function load(session) {
      let isMember = false;
      if (session) {
        const { data } = await supabase.from("memberships").select("org_id").limit(1);
        isMember = (data ?? []).length > 0;
      }
      if (alive) setState({ loading: false, session, isMember });
    }
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => load(session));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  return state;
}
