"use client";

import {
  collection,
  doc,
  onSnapshot,
  query as buildQuery,
  type DocumentData,
  type Query,
  type QueryConstraint,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/types/academy";

type FirestoreState<T> = {
  data: T[];
  loading: boolean;
  error: string | null;
};

function readError(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    if (error.code === "permission-denied") return "You do not have access to this data.";
  }
  return "Unable to load this section right now.";
}

export function useCollection<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  enabled = true,
): FirestoreState<T & { id: string }> {
  const query = useMemo<Query<DocumentData> | null>(() => {
    if (!enabled) return null;
    const source = collection(db, collectionName);
    return constraints.length ? buildQuery(source, ...constraints) : source;
  }, [collectionName, constraints, enabled]);
  const [state, setState] = useState<FirestoreState<T & { id: string }>>({
    data: [],
    loading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!query) {
      return undefined;
    }

    return onSnapshot(
      query,
      (snapshot) => {
        setState({
          data: snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as (T & { id: string })[],
          loading: false,
          error: null,
        });
      },
      (error) => setState({ data: [], loading: false, error: readError(error) }),
    );
  }, [query]);

  return state;
}

export function useProfile(uid: string | undefined) {
  const [state, setState] = useState<{
    data: UserProfile | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: Boolean(uid), error: null });

  useEffect(() => {
    if (!uid) {
      return undefined;
    }

    return onSnapshot(
      doc(db, "users", uid),
      (snapshot) => {
        if (!snapshot.exists()) {
          setState({
            data: null,
            loading: false,
            error: "Your profile is setting up. Please refresh shortly.",
          });
          return;
        }
        setState({
          data: { id: snapshot.id, ...snapshot.data() } as UserProfile,
          loading: false,
          error: null,
        });
      },
      (error) => setState({
        data: null,
        loading: false,
        error:
          error.code === "permission-denied"
            ? "Your profile is setting up. Please refresh shortly."
            : "Unable to load your profile right now.",
      }),
    );
  }, [uid]);

  return state;
}
