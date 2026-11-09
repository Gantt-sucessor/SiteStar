import { createContext, useContext, useEffect, useState } from 'react';

// Define para onde vão as rolagens feitas na tela atual (campanha + personagem).
const Ctx = createContext({ target: null, setTarget: () => {} });

export function RollTargetProvider({ children }) {
  const [target, setTarget] = useState(null);
  return <Ctx.Provider value={{ target, setTarget }}>{children}</Ctx.Provider>;
}

export const useRollTarget = () => useContext(Ctx);

export function useSetRollTarget(target) {
  const { setTarget } = useContext(Ctx);
  const key = JSON.stringify(target);
  useEffect(() => {
    setTarget(target);
    return () => setTarget(null);
  }, [key]);
}
