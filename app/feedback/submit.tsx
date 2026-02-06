import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Heart, Star, Send } from 'lucide-react-native';

interface FeedbackRequest {
  id: string;
  cycle_id: string;
  sender_id: string;
  status: string;
  expires_at: string;
  sender_name?: string;
  verification_hint: string | null;
}

interface Trait {
  id: string;
  name: string;
  description: string;
  display_order: number;
}

interface Rating {
  trait_id: string;
  rating: number;
  reflection: string;
}

export default function SubmitFeedbackScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState<FeedbackRequest | null>(null);
  const [traits, setTraits] = useState<Trait[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [verificationInput, setVerificationInput] = useState('');

  useEffect(() => {
    loadRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadRequest = async () => {
    if (!token) {
      setError('Invalid feedback link');
      setLoading(false);
      return;
    }

    try {
      const { data: requestData, error: requestError } = await supabase
        .from('feedback_requests')
        .select(
          `
          *,
          users!feedback_requests_sender_id_fkey(full_name)
        `
        )
        .eq('unique_token', token)
        .maybeSingle();

      if (requestError) throw requestError;

      if (!requestData) {
        setError('This feedback link is invalid or has expired');
        setLoading(false);
        return;
      }

      if (requestData.status === 'completed') {
        setError('This feedback has already been submitted');
        setLoading(false);
        return;
      }

      if (new Date(requestData.expires_at) < new Date()) {
        setError('This feedback link has expired');
        setLoading(false);
        return;
      }

      const senderName = requestData.users?.full_name || 'someone';
      setRequest({
        ...requestData,
        sender_name: senderName,
        verification_hint: requestData.verification_hint,
      });

      const { data: traitsData, error: traitsError } = await supabase
        .from('traits')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (traitsError) throw traitsError;

      setTraits(traitsData || []);
      setRatings(
        (traitsData || []).map((trait) => ({
          trait_id: trait.id,
          rating: 0,
          reflection: '',
        }))
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to load feedback form');
    } finally {
      setLoading(false);
    }
  };

  const updateRating = (traitId: string, rating: number) => {
    setRatings((prev) =>
      prev.map((r) => (r.trait_id === traitId ? { ...r, rating } : r))
    );
  };

  const updateReflection = (traitId: string, reflection: string) => {
    setRatings((prev) =>
      prev.map((r) => (r.trait_id === traitId ? { ...r, reflection } : r))
    );
  };

  const handleVerify = () => {
    if (!request?.verification_hint) {
      setVerified(true);
      return;
    }

    const cleanedInput = verificationInput
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();

    const hint = request.verification_hint.toLowerCase();

    const inputCode = cleanedInput.length >= 4 ? cleanedInput.slice(-4) : cleanedInput;

    if (inputCode === hint || cleanedInput === hint) {
      setVerified(true);
      setError(null);
    } else {
      Alert.alert(
        'Verification Failed',
        'The code you entered does not match. Please check the message from the person who sent you this link and try again.'
      );
    }
  };

  // ✅ BEST PRACTICE: submit through Edge Function (bypasses client RLS issues)
  const handleSubmit = async () => {
    const incomplete = ratings.filter((r) => r.rating === 0);
    if (incomplete.length > 0) {
      Alert.alert('Incomplete', 'Please rate all characteristics');
      return;
    }

    if (!request) return;
    if (!token) {
      Alert.alert('Error', 'Invalid feedback link (missing token)');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        token,
        verification_input: verificationInput?.trim() || null,
        ratings: ratings.map((r) => ({
          trait_id: r.trait_id,
          rating: r.rating,
          reflection: r.reflection.trim() || null,
        })),
      };

      const { data, error: fnError } = await supabase.functions.invoke(
        'submit-feedback',
        { body: payload }
      );

      console.log('submit-feedback data:', data);
      console.log('submit-feedback error:', fnError);

      if (fnError) throw new Error(fnError.message || 'Failed to submit feedback');
      if (data?.error) throw new Error(data.error);

      router.replace({
        pathname: '/feedback/thank-you',
        params: { senderName: request.sender_name || 'them' },
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading feedback form...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Heart size={48} color="#EF4444" strokeWidth={2} />
        <Text style={styles.errorTitle}>Unable to Load Form</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!verified && request?.verification_hint) {
    return (
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(40, insets.bottom + 20) },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Heart size={40} color="#FF6B6B" strokeWidth={2} />
          </View>
          <Text style={styles.title}>Verify Your Identity</Text>
          <Text style={styles.subtitle}>
            To ensure this feedback is from the intended recipient, please enter the verification
            code shared with you.
          </Text>
        </View>

        <View style={styles.verificationCard}>
          <Text style={styles.verificationLabel}>
            Enter the verification code from the message:
          </Text>
          <TextInput
            style={styles.verificationInput}
            placeholder="Enter code"
            placeholderTextColor="#9CA3AF"
            value={verificationInput}
            onChangeText={setVerificationInput}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.verifyButton, !verificationInput.trim() && styles.verifyButtonDisabled]}
            onPress={handleVerify}
            disabled={!verificationInput.trim()}
          >
            <Text style={styles.verifyButtonText}>Verify & Continue</Text>
          </TouchableOpacity>
          <Text style={styles.verificationHint}>
            This link was sent specifically to you. If you didn&apos;t receive a verification code,
            please contact the person who sent you this link.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(40, insets.bottom + 20) },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Heart size={40} color="#FF6B6B" strokeWidth={2} />
        </View>
        <Text style={styles.title}>Share Your Feedback</Text>
        <Text style={styles.subtitle}>
          Your honest, thoughtful feedback helps {request?.sender_name || 'someone'} grow. All
          responses are anonymous and will be aggregated with others.
        </Text>
      </View>

      <View style={styles.reassuranceCard}>
        <Text style={styles.reassuranceTitle}>Your Privacy Matters</Text>
        <Text style={styles.reassuranceText}>
          Individual responses are never shown. Your feedback will be combined with others to create
          encouraging, growth-focused insights.
        </Text>
      </View>

      {traits.map((trait) => {
        const rating = ratings.find((r) => r.trait_id === trait.id);
        return (
          <View key={trait.id} style={styles.traitCard}>
            <Text style={styles.traitName}>{trait.name}</Text>
            <Text style={styles.traitDescription}>{trait.description}</Text>

            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={styles.ratingButton}
                  onPress={() => updateRating(trait.id, value)}
                >
                  <Star
                    size={32}
                    color="#FF6B6B"
                    fill={rating && rating.rating >= value ? '#FF6B6B' : 'none'}
                    strokeWidth={2}
                  />
                  <Text style={styles.ratingLabel}>{value}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reflectionInput}
              placeholder="Optional: Share a specific example or thought..."
              placeholderTextColor="#9CA3AF"
              value={rating?.reflection || ''}
              onChangeText={(text) => updateReflection(trait.id, text)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Send size={20} color="#FFFFFF" strokeWidth={2} />
        <Text style={styles.submitButtonText}>
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.footerNote}>
        Thank you for taking the time to help {request?.sender_name || 'someone'} grow. Your kindness
        and honesty make a real difference.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  reassuranceCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  reassuranceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3730A3',
    marginBottom: 6,
  },
  reassuranceText: {
    fontSize: 14,
    color: '#4338CA',
    lineHeight: 20,
  },
  traitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  traitName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  traitDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ratingButton: {
    alignItems: 'center',
    flex: 1,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  reflectionInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footerNote: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  verificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  verificationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  verificationInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: '600',
    marginBottom: 16,
  },
  verifyButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  verificationHint: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});
