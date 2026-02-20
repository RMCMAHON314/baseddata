import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const checkConnection = useCallback(async () => {
    try {
      const { error } = await supabase.from("core_entities").select("id", { count: "exact", head: true });
      setIsConnected(!error);
      setLastCheck(new Date());
    } catch {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  return { isConnected, lastCheck, checkConnection };
}