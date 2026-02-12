// Tests pour AuthContext
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { secureStorage } from '../../src/services/secureStorage';

jest.mock('../../src/lib/supabase');
jest.mock('../../src/services/secureStorage');
jest.mock('../../src/services/analytics');
jest.mock('../../src/services/crashReporting');

const wrapper = ({ children }: any) => <AuthProvider>{children}</AuthProvider>;

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    });

    (secureStorage.isBiometricAvailable as jest.Mock).mockResolvedValue(true);
  });

  it('should provide auth context', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current).toBeDefined();
      expect(result.current.loading).toBe(false);
    });
  });

  it('should sign in successfully', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: {
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'token-123' },
      },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let response: any;
    await act(async () => {
      response = await result.current.signIn('test@example.com', 'password123');
    });

    expect(response.error).toBeNull();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should sign in with biometrics', async () => {
    (secureStorage.getItemWithBiometrics as jest.Mock).mockResolvedValue('token-123');
    (secureStorage.getRefreshToken as jest.Mock).mockResolvedValue('refresh-123');
    (supabase.auth.setSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'token-123' } },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let response: any;
    await act(async () => {
      response = await result.current.signInWithBiometrics();
    });

    expect(response.error).toBeNull();
    expect(secureStorage.getItemWithBiometrics).toHaveBeenCalledWith('auth_token');
  });

  it('should sign out successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(secureStorage.clearTokens).toHaveBeenCalled();
  });

  it('should check biometric availability', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isBiometricAvailable).toBe(true);
    });

    expect(secureStorage.isBiometricAvailable).toHaveBeenCalled();
  });
});
