/**
 * useAuth.js — thin re-export hook for AuthContext
 * Separated so that React Fast Refresh can process this file without conflicts.
 */
import { useContext } from 'react';
import { AuthContext } from './AuthContext';

export const useAuth = () => useContext(AuthContext);
