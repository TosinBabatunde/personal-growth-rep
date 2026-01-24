import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, CheckCircle } from 'lucide-react-native';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  const [success, setSuccess] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState<number | null>(null);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);

  /* ----------------------------------------
     Verify password recovery session
  -----------------------------------------*/
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const checkSession = async () => {
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const url = new URL(window.location.href);

          // PKCE flow (?code=...)
          const code = url.searchParams.get('code');
          if (code) {
            const { error } =
              await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
              url.searchParams.delete('code');
              window.history.replaceState({}, document.title, url.toString());
            }
          }

          // Hash tokens (#access_token=...)
          const hash = window.location.hash.replace('#', '');
          if (hash) {
            const params = new URLSearchParams(hash);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');

            if (access_token && refresh_token) {
              const { error } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });

              if (!error) {
                window.history.replaceState(
                  {},
                  document.title,
                  window.location.pathname
                );
              }
            }
          }
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setCheckingSession(false);
          if (timeoutId) clearTimeout(timeoutId);
          return;
        }

        timeoutId = setTimeout(() => {
          setCheckingSession(false);
          Alert.alert(
            'Session Required',
            'Please click the password reset link from your email to continue.',
            [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in') }]
          );
        }, 2000);
      } catch (err) {
        console.error('Error checking session:', err);
        setCheckingSession(false);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
          setCheckingSession(false);
          if (timeoutId) clearTimeout(timeoutId);
        }
      }
    );

    checkSession();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      listener.subscription.unsubscribe();
    };
  }, [router]);

  /* ----------------------------------------
     Success redirect countdown
  -----------------------------------------*/
  useEffect(() => {
    if (!success) return;

    setRedirectSeconds(3);

    const interval = setInterval(() => {
      setRedirectSeconds((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(interval);
          router.replace('/(auth)/sign-in');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [success, router]);

  /* ----------------------------------------
     Scroll to top when success appears
  -----------------------------------------*/
  useEffect(() => {
    if (!success) return;

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, [success]);

  /* ----------------------------------------
     Reset password handler
  -----------------------------------------*/
  const handleResetPassword = async () => {
    setError('');

    if (!password.trim() || !confirmPassword.trim()) {
      const msg = 'Please enter your new password';
      setError(msg);
      Alert.alert('Error', msg);
      return;
    }

    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters';
      setError(msg);
      Alert.alert('Error', msg);
      return;
    }

    if (password !== confirmPassword) {
      const msg = 'Passwords do not match';
      setError(msg);
      Alert.alert('Error', msg);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please click the reset link again.');
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      await supabase.auth.signOut();

      setPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (err: any) {
      const msg = err.message || 'Failed to reset password';
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Verifying reset link...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(40, insets.bottom + 20) },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={!(success || loading)}
        alwaysBounceVertical={!(success || loading)}
        overScrollMode={success || loading ? 'never' : 'auto'}
        scrollEnabled={!loading}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <CheckCircle size={48} color="#10B981" strokeWidth={2} />
          </View>
          <Text style={styles.title}>Reset Your Password</Text>
          <Text style={styles.subtitle}>
            Enter your new password below. Make sure it’s strong and secure.
          </Text>
        </View>

        <View style={styles.form}>
          {success && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                Your password has been reset.
              </Text>
              {redirectSeconds !== null && (
                <Text style={styles.successSubtext}>
                  Redirecting to sign in in {redirectSeconds}s…
                </Text>
              )}
            </View>
          )}

          {error && !success && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>New Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter new password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError('');
              }}
              secureTextEntry={!showPassword}
              editable={!loading && !success}
              autoComplete="password-new"
              textContentType="newPassword"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              disabled={success}
            >
              {showPassword ? (
                <EyeOff size={20} color="#6B7280" />
              ) : (
                <Eye size={20} color="#6B7280" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Re-enter new password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                setError('');
              }}
              secureTextEntry={!showConfirmPassword}
              editable={!loading && !success}
              autoComplete="password-new"
              textContentType="newPassword"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={success}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color="#6B7280" />
              ) : (
                <Eye size={20} color="#6B7280" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            Password must be at least 6 characters long
          </Text>

          <TouchableOpacity
            style={[
              styles.button,
              (loading || success) && styles.buttonDisabled,
            ]}
            onPress={handleResetPassword}
            disabled={loading || success}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Updating Password...' : 'Reset Password'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.replace('/(auth)/sign-in')}
            disabled={loading || success}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ----------------------------------------
   Styles
-----------------------------------------*/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { fontSize: 16, color: '#6B7280' },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: { alignItems: 'center', marginBottom: 40 },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: { width: '100%' },
  successContainer: {
    backgroundColor: '#D1FAE5',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  successText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '700',
  },
  successSubtext: {
    marginTop: 6,
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  passwordInput: { flex: 1, height: 50, fontSize: 16 },
  eyeButton: { padding: 8 },
  hint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  cancelButton: { marginTop: 16, alignItems: 'center' },
  cancelButtonText: { color: '#6B7280', fontSize: 16, fontWeight: '600' },
});
