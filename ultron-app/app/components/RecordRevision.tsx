"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const RecordRevisionContext = createContext({ revision: 0, refresh: () => {} });

/** Lets the chat tell the views of a record that they have to load it again */
export function RecordRevisionProvider({ children }: { children: ReactNode }) {
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision((current) => current + 1);

  return (
    <RecordRevisionContext.Provider value={{ revision, refresh }}>
      {children}
    </RecordRevisionContext.Provider>
  );
}

export const useRecordRevision = () => useContext(RecordRevisionContext);
